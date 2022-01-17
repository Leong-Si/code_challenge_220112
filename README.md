# code_challenge_220112
Run 'docker-compose up --detach --build' at the root directory ('code_challenge_220112/') to build and launch the services.

The client web page can be accessed on 'http://localhost:8000/'.

Customer ID must be inputed before initiating the API call via the Submit button. Use the '+ Add Item' button to add items for the api. The red 'x' button on the right will remove an item listing. The 'x Reset' button will clear all item listings.

The list of valid inputs when the services first start are the following:

Customer IDs:
1, 2, 3, 4, 5

Item IDs (automatically pulled from database onto a dropdown list):
5, 1254, 30342, 671, 59211

The TaxJar authorization token expires on February 15th.

To stop and remove the services and the related volumes and images, use 'docker-compose down --volumes --rmi all' at the root directory.
