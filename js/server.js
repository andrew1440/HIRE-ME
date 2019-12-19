var http = require('http'); //require the http module for server creation
var fs = require('fs'); //require the file system module for file manipulation
var url = require('url'); //require the url module for  url manipulation
var formidable = require('formidable'); //require formidable for form manipulation
//createt http server to listen on port 1999
http.createServer(function(req, res){
    res.writeHead(200,{'Content-Type': 'text/html'});
    var q = url.parse(req.url,true); //parse the query string
    var pathname = q.pathname; //extract the requested pathname
    //console.log('GET '+pathname); //log the get request for the path name to the console
    if(pathname == '/process_login'){
        var form = formidable.IncomingForm(); //create a new form object from the formidable object module
        form.parse(req,function(err, fields, files){ //parse the form into individual fields and files
            //res.write('user name: '+fields.name+'\npassword: '+fields.pass);
	    //checking if the supplied username and password matches the required values 
            if(fields.name == 'charlo' && fields.pass == 'bingo'){
		res.write('login sucess'); //output the success login message
		//res.end();
            } else{
		res.write('Login failed, try again'); //output the login failed message
		//res.end();
	    }
        });
    } 
    //else if(pathname == '/'){
        fs.readFile('../index.html',function(err,data){ //add read the index.html file into the program
            if(err){
                res.write(404); //output a 404 not found error incase of error
                res.end();
            } else{
		res.write(data); //output read data onto the browser
                res.end();
            }
        });
    //}
}).listen(1999);
