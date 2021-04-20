How to serve csv files from a folder

install the node module http-server
	npm install http-server

make sure you are in the folder where the csv file is
start the http server with cross-origin requests allowed
choose port 8081 so as not to collide with the tech radar server
	http-server --cors --port 8081

