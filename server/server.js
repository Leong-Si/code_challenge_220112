const http = require('follow-redirects').http;
const url = require('url');
const { Pool } = require('pg');
const fs = require('fs');

const config = require('./config.json');

// http config
const port = 8080;

// node-postgres config
const pool = new Pool({
  user: config.db_user,
  host: config.db_hostname,
  database: config.db_database,
  password: config.db_pw,
  port: config.db_port
});

function SeedsDatabase() {
  const fileContent = fs.readFileSync(__dirname + '/seeds.sql', 'utf8');
  return pool.query(fileContent);
}

function PaymentRequest(customerID, itemQuantityMap, callback, errCallback) {
  console.log(`Processing payment request for customer ${customerID}.`);
  let customerName, customerCountry, customerZip;
  /*
   * Fetch customer information from database
   */
  const customerInfoQuery =
  ` SELECT name, country, zip
    FROM Customer
    WHERE id=$1;
  `;
  const customerInfoPromise = pool.query(customerInfoQuery, [customerID]);

  /*
   * Fetch item information from database
   */
  const itemsInfoQuery =
  ` SELECT id, price
    FROM Item
    WHERE id = ANY($1::int[]);
  `;
  const itemsInfoPromise = pool.query(itemsInfoQuery, [Array.from(itemQuantityMap.keys())]);

  /*
   * Call TaxJar api for tax rates
   */
  Promise.all([customerInfoPromise, itemsInfoPromise]).then((values) => {
    let customerResult = values[0];
    let itemsResult = values[1];

    if (customerResult.rows.length <= 0) {
      return errCallback && errCallback('Customer not found.');
    } else {
      customerName = customerResult.rows[0].name;
      customerCountry = customerResult.rows[0].country;
      customerZip = customerResult.rows[0].zip;

      const reqHost = 'api.taxjar.com';
      const reqPath = `/v2/rates/${customerZip}?country=${customerCountry}`;

      const taxJarReqOptions = {
        hostname: reqHost,
        path: reqPath,
        headers: {
          'Authorization': config.taxJarAuth,
          'Accept': 'application/json'
        }
      };

      console.log(`Requesting TaxJar API at ${reqHost}${reqPath}`);
      http.get(taxJarReqOptions, (res) => {
        const { statusCode } = res;
        const contentType = res.headers['content-type'];

        if (statusCode >= 400) {
          res.resume();
          return errCallback && errCallback(`Request Failed. Status Code: ${statusCode}.`);
        }

        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          try {
            console.log(`TaxJar request completed. Response: \n${rawData}`);
            const parsedData = JSON.parse(rawData);

            /*
             * Calculate base price, tax component, and total price for each item
             */
            let taxrate;
            if (parsedData.rate && parsedData.rate.combined_rate) {
              taxrate = parsedData.rate.combined_rate;
            } else if (parsedData.rate && parsedData.rate.standard_rate) {
              taxrate = parsedData.rate.standard_rate;
            }

            let itemsOutput = [];
            let subTotalSum = 0.00;
            for (let i=0; i<itemsResult.rows.length; ++i) {
              let itemResult = itemsResult.rows[i];

              let basePrice = itemResult.price;
              let itemQuantity = itemQuantityMap.get(itemResult.id)

              let subTotal = basePrice * itemQuantity;
              subTotalSum += subTotal;
              itemsOutput.push({
                id: itemResult.id,
                subTotal: subTotal
              });
            }

            let taxComponent = subTotalSum * taxrate;
            let totalPrice = subTotalSum + taxComponent;

            let output = {
              name: customerName,
              items: itemsOutput,
              taxComponent: taxComponent,
              totalPrice: totalPrice
            };

            return callback && callback(JSON.stringify(output));
          } catch (e) {
            return errCallback && errCallback(e.message);
          }
        });
      }).on('error', (e) => {
        return errCallback && errCallback(e.message);
      });
    }
  }).catch(err => errCallback && errCallback(err.message));
}

function AllItemRequest(callback, errCallback) {
  /*
   * Fetch item IDs from database
   */
  const itemsIDQuery =
  ` SELECT id
    FROM Item
  `;
  pool.query(itemsIDQuery)
    .then((queryResult) => {
      let idArray = [];
      for (let i=0; i<queryResult.rows.length; ++i) {
        idArray.push(queryResult.rows[i].id);
      }
      return callback && callback(JSON.stringify(idArray));
    }).catch(err => {
      return errCallback && errCallback(err.message);
    });
}

const requestListener = function(req, res) {
  console.log(`${req.method} request received for ${req.url}`);

  let url = new URL(req.url, `http://${req.headers.host}`);
  let args = url.pathname.split('/').filter(arg => arg); // Use .filter to remove empty items

  if (req.method == 'GET') {
    switch (args.shift()) {
      case 'api':
        switch (args.shift()) {
          case 'payment':
            let customerID = parseInt(url.searchParams.get('customer'), 10);
            let itemIDs = url.searchParams.getAll('items').map(e => e.split(',')).flat();
            let quantities = url.searchParams.getAll('quantities').map(e => e.split(',')).flat();

            if (isNaN(customerID) || itemIDs.some(e => isNaN(e)) || quantities.some(e => isNaN(e))) {
              res.writeHead(500);
              res.end('Invalid query parameters.');
              return;
            }

            let itemQuantityMap = new Map();
            for (let i=0; i<itemIDs.length; ++i) {
              let parsedItemID = parseInt(itemIDs[i], 10);

              let quantity = quantities.length <= i ? 0 : parseInt(quantities[i], 10);
              quantity = Math.max(0, quantity);

              if (itemQuantityMap.has(parsedItemID)) {
                let prevQuantity = itemQuantityMap.get(parsedItemID);
                itemQuantityMap.set(parsedItemID, prevQuantity + quantity)
              } else {
                itemQuantityMap.set(parsedItemID, quantity);
              }
            }

            PaymentRequest(customerID, itemQuantityMap, (result) => {
              res.setHeader('Content-Type', 'application/json');
              // Added header to allow using the api with localhost
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.writeHead(200);
              console.log(result);
              res.end(result);
            }, (err) => {
              res.writeHead(500);
              res.end(err);
            });
            break;
          case 'allitems':
            AllItemRequest((result) => {
              res.setHeader('Content-Type', 'application/json');
              // Added header to allow using the api with localhost
              res.setHeader('Access-Control-Allow-Origin', '*');
              console.log(result);
              res.writeHead(200);
              res.end(result);
            }, (err) => {
              res.writeHead(500);
              res.end(err);
            });
            break;
          default:
            res.writeHead(404);
            res.end('Path not found.');
            break;
        }
        break;
      default:
        res.writeHead(404);
        res.end('Path not found.');
        break;
    }
  } else {
    res.writeHead(404);
    res.end('Invalid request method.');
  }
}

var server;
SeedsDatabase().then((result) => {
  server = http.createServer(requestListener);
  server.listen(port, () => {
    console.log(`Server is running on port ${port}.`);
  });
})
