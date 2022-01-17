const serverHostname = 'localhost';
const serverPort = '8080';
var itemIDs = new Set();

function load() {

  function price(x) {
    return Number.parseFloat(x).toFixed(2);
  }

  function displayPaymentResult(paymentResult) {
    let subTotalTableRowsHTML = '';
    for (let item of paymentResult.items.sort((a, b) => a.id - b.id)) {
      subTotalTableRowsHTML += `
        <tr>
          <td>${item.id}</td>
          <td>${price(item.subTotal)}</td>
        </tr>`;
    }

    let tableHTML = `
    <table>
      <thead>
        <tr>
          <th colspan='2'>${paymentResult.name}</th>
        </tr>
        <tr>
          <th scope='col'>Item ID</th>
          <th scope='col'>Sub-total</th>
        </tr>
      </thead>
      <tbody>
        ${subTotalTableRowsHTML}
      </tbody>
      <tfoot>
        <tr>
          <th scope='row'>Tax Component</th>
          <td>${price(paymentResult.taxComponent)}</td>
        </tr>
        <tr>
          <th scope='row'>Totals</th>
          <td>${price(paymentResult.totalPrice)}</td>
        </tr>
      </tfoot>
    </table>
    `;

    for (let paymentResultContainer of document.querySelectorAll('.payment-result')) {
      paymentResultContainer.innerHTML = tableHTML;
    }
  }

  function generateItemEntryElement() {
    let itemEntryDiv = document.createElement('div');
    itemEntryDiv.classList.add('itemEntry');

    let infoDiv = document.createElement('div');
    infoDiv.classList.add('itemEntry-info');

    /*
     * ID
     */
    let idDiv = document.createElement('div');

    let idLabel = document.createElement('span');
    idLabel.textContent = 'id:';
    idDiv.appendChild(idLabel);

    let idSelect = document.createElement('select');
    idSelect.classList.add('itemEntry-id-select');
    idDiv.appendChild(idSelect);

    let defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.text = '--Item ID--';
    idSelect.add(defaultOption);

    itemIDs.forEach(id => {
      let idOption = document.createElement('option');
      idOption.value = id;
      idOption.text = id;
      idSelect.add(idOption);
    });

    /*
     * Quantity
     */
    let quantityDiv = document.createElement('div');

    let quantityLabel = document.createElement('span');
    quantityLabel.textContent = 'quantity:';
    quantityDiv.appendChild(quantityLabel);

    let quantityInput = document.createElement('input');
    quantityInput.type = 'number';
    quantityInput.classList.add('itemEntry-quantity-input');
    quantityInput.oninput = (event) => {
      event.target.value = Math.max(0, Math.min(999999, event.target.value));
    };
    quantityDiv.appendChild(quantityInput);

    /*
     * Delete button
    */
    let deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.innerHTML = '&times;';
    deleteButton.classList.add('itemEntry-delete-btn');
    deleteButton.onclick = (event) => {
      itemEntryDiv.remove();
    };

    infoDiv.appendChild(idDiv);
    infoDiv.appendChild(quantityDiv);

    itemEntryDiv.appendChild(infoDiv);
    itemEntryDiv.appendChild(deleteButton);

    return itemEntryDiv;
  }

  function addItemToItemList() {
    for (let listContainer of document.querySelectorAll('.item-list')) {
      listContainer.appendChild(generateItemEntryElement());
    }
  }

  function resetItemList() {
    for (let listContainer of document.querySelectorAll('.item-list')) {
      listContainer.innerHTML = '';
    }
  }

  function submitItemList() {
    let listContainer = document.querySelector('.item-list');
    if (listContainer) {
      let idArray = [];
      let quantityArray = [];
      for (let itemEntry of listContainer.querySelectorAll('.itemEntry')) {
        let itemID = itemEntry.querySelector('.itemEntry-id-select').value;
        let itemQuantity = itemEntry.querySelector('.itemEntry-quantity-input').value;

        if (itemID && itemQuantity) {
          idArray.push(itemID);
          quantityArray.push(itemQuantity);
        }
      }

      let customerID = document.getElementById('customer-id-input').value;

      if (customerID && idArray.length > 0 && quantityArray.length > 0) {
        const requestPath = `payment?customer=${customerID}&items=${idArray.join(',')}&quantities=${quantityArray.join(',')}`;
        fetch(`http://${serverHostname}:${serverPort}/api/${requestPath}`)
          .then((res) => res.json())
          .then((data) => {
            displayPaymentResult(data)
          }).catch((e) => console.log(e));
      }
    }
  }

  for (let btn of document.querySelectorAll('.item-controls-add-item')) {
    btn.onclick = (event) => {
      addItemToItemList();
    };
  }

  for (let btn of document.querySelectorAll('.item-controls-reset')) {
    btn.onclick = (event) => {
      resetItemList();
    };
  }

  for (let btn of document.querySelectorAll('.item-controls-submit')) {
    btn.onclick = (event) => {
      submitItemList();
    };
  }
}

window.onload = (event) => {
  fetch(`http://${serverHostname}:${serverPort}/api/allitems`)
    .then((res) => res.json())
    .then((data) => {
      data.sort((a, b) => a - b).forEach(e => itemIDs.add(e));
      let template = document.getElementsByTagName("template")[0];
      document.body.appendChild(template.content.cloneNode(true));
      load();
    }).catch((e) => console.log(e));
};
