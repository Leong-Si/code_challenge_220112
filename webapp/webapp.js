const http = require('follow-redirects').http;
const url = require('url');
const fs = require('fs').promises;

// http config
const port = 8000;

const webpageReadFile = function(url, cb, ecb) {
  fs.readFile(__dirname + url, 'utf8')
    .then(contents => cb && cb(contents))
    .catch(err => ecb && ecb(err));
}

const requestListener = function(req, res) {
  console.log(`${req.method} request received for ${req.url}`);

  const requestError = function(err) {
    console.log(err);
    res.writeHead(500);
    res.end('Server error.');
  };

  let url = new URL(req.url, `http://${req.headers.host}`);
  let args = url.pathname.split('/').filter(arg => arg); // Use .filter to remove empty items

  if (req.method == 'GET') {
    let arg = args.shift();
    switch (arg) {
      case 'css':
      case 'js':
        webpageReadFile(url.pathname, function(contents) {
          let contentType = (arg == 'css') ? 'text/css' : 'application/javascript'
          res.setHeader('Content-Type', contentType);
          res.writeHead(200);
          res.end(contents);
        }, requestError);
        break;
      default:
        if (arg) {
          res.writeHead(302, {
            'Location': '/'
          });
          res.end();
        } else {
          webpageReadFile('/html/index.html', function(contents) {
            res.setHeader('Content-Type', 'text/html');
            res.writeHead(200);
            res.end(contents);
          }, requestError);
        }
        break;
    }
  } else {
    res.writeHead(404);
    res.end();
  }
}

const server = http.createServer(requestListener);
server.listen(port, () => {
  console.log(`Server is running on port ${port}.`);
});
