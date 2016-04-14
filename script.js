var dimensions = 0;
var debug = false;

$(document).ready(function() {
	$('#fileInput').on('change', newFile);

	// bug();

	//var demo = demoData();
	//render(demo);
});

function render(data) {
	resizeCanvas(data);
	putDataIntoCanvas(data);
	finished();
}

function demoData() {
	var demo = "";
	var w = 128*128*4;
	for(i=0;i<w;i++) {
		demo += String.fromCharCode(Math.floor(Math.random()*255));
	}
	return demo;
}

function finished() {
	var canvas = $('#steg')[0];
	var url = canvas.toDataURL("image/png");
	if(debug) console.log("IN URL",url);
	$('#imageOut')[0].src = url; //this will make an image the user can right click on to download
}

function newFile(e) {
	var file = $('#fileInput')[0].files[0];

	var reader = new FileReader();
	reader.onload = function(e) {
		if(file.type=="image/png") {
			imagetoString(reader.result);
		} else {
			var fileData = reader.result;
			if(debug) console.log("IN base64:",fileData);
			var b64Start = fileData.lastIndexOf(",")+1;
			var b64Header = padTo(fileData.substr(0,b64Start),64); //technically 268 is the max, but really?
			var b64Data = fileData.substr(b64Start);
			var compressed = compressBase64(b64Data);
			var b64Size = padTo((compressed.length)+'',10);
			if(b64Header.indexOf("text/plain")>0) {
				if(debug) console.log("IN DECODED:",b64Header,b64Size,b64Data,window.atob(b64Data));
				$('#inData').html(window.atob(b64Data));
			} else if(b64Header.indexOf("image/jpeg")>0) {
				$('#inData').html("<img src='"+fileData+"'>");
			}
			render(b64Header+b64Size+compressed);
		}
	};
	reader.readAsDataURL(file); //Base64
}

function padTo(str,size) {
	for(var i = str.length;i<size;i++) str += ".";
	return str;
}
function removePad(str) {
	return str.replace(/\./g,"");
}
function compressBase64(base64) {
	// return base64;

	var base64table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
	var base256 = "";

	for(i=0;i<base64.length;i+=4) {
		var b1 = base64table.indexOf(base64.substr(i,1)); 		//for each character of base64 string
		var b2 = base64table.indexOf(base64.substr(i+1,1));	//grab index into base64 table
		var b3 = base64table.indexOf(base64.substr(i+2,1));	//so we now have a 6 bit number 0-63
		var b4 = base64table.indexOf(base64.substr(i+3,1)); 

		if(b1<0) { //handles padding characters in the base64
			b1=0;
			console.log("!data loss",base64.substr(i,1)); 
		}
		if(b2<0) {
			b2=0; 
			console.log("!data loss",base64.substr(i+1,1));
		}
		if(b3<0) {
			b3=0; 
			console.log("!data loss",base64.substr(i+2,1));
		}
		if(b4<0) {
			b4=0; 
			console.log("!data loss",base64.substr(i+3,1));
		}

		if ((b4 & (1 << 0)) != 0) b1 |= 1 << 7; //b4 gets split up and stuffed into 
		if ((b4 & (1 << 1)) != 0) b1 |= 1 << 6; //the top 2 bits of b1, b2, b3
		if ((b4 & (1 << 2)) != 0) b2 |= 1 << 7;
		if ((b4 & (1 << 3)) != 0) b2 |= 1 << 6;
		if ((b4 & (1 << 4)) != 0) b3 |= 1 << 7;
		if ((b4 & (1 << 5)) != 0) b3 |= 1 << 6;
		
		base256 += String.fromCharCode(b1)+String.fromCharCode(b2)+String.fromCharCode(b3); //put b1,b2,b3 back into string. b4 is now redundant
	}
	
	// console.log(base64,base256);

	return base256;
}

function uncompressBase256(base256) {
	// return base256;
	var base64table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
	var base64 = "";

	for(i=0;i<base256.length;i+=3) {
		var c1 = base256.charCodeAt(i);
		var c2 = base256.charCodeAt(i+1);
		var c3 = base256.charCodeAt(i+2);
		var c4 = 0;
	
		if ((c1 & (1 << 7)) != 0) c4 |= 1 << 0; 	//take the top 2 bits from each of c1, c2, c3
		if ((c1 & (1 << 6)) != 0) c4 |= 1 << 1;	//and reconstructs a c4
		if ((c2 & (1 << 7)) != 0) c4 |= 1 << 2;
		if ((c2 & (1 << 6)) != 0) c4 |= 1 << 3;
		if ((c3 & (1 << 7)) != 0) c4 |= 1 << 4;
		if ((c3 & (1 << 6)) != 0) c4 |= 1 << 5;
		
		c1 &= ~(1<<7); c1 &= ~(1<<6); //clear the top two bits of c1, c2, c2
		c2 &= ~(1<<7); c2 &= ~(1<<6);
		c3 &= ~(1<<7); c3 &= ~(1<<6);

		c1 = base64table.substr(c1,1); //turn index back into base 64
		c2 = base64table.substr(c2,1);
		c3 = base64table.substr(c3,1);
		c4 = base64table.substr(c4,1);

		base64 += c1+c2+c3+c4;
	}
	
	// console.log(base256,base64);

	return base64;
}

function imagetoString(imageData) {

	var img = $('#imageIn')[0];
	img.src = imageData;

	if(debug) console.log("OUT URL",img.src,img.width,img.height);
	
	if(img.width==0) image.width=4;
	if(img.height==0) image.height=4;

	var canvas = document.createElement('canvas');
	var ct = canvas.getContext('2d');
	ct.canvas.width = img.width;
	ct.canvas.height = img.height;
	ct.clearRect(0, 0, img.width, img.height);

	ct.drawImage(img,0,0);
	var image = ct.getImageData(0,0,img.width,img.height);
	var data = image.data;
	if(debug) console.log("OUT PIXELS:",data,img.width,img.height);

	var str = "";
	for (var i = 0; i < data.length; i++) {
		if((i+1)%4==0) {
			//dup alpha channel
		} else {
			var c = data[i];
			str += String.fromCharCode(c);
		}
	}

	if(debug) console.log("OUT Base256:",str);

	var header = removePad(str.substr(0,64));
	var size = removePad(str.substr(64,10));
	var data = str.substr(74,size);
	var orig = uncompressBase256(data);
	if(debug) console.log("OUT Base64:",header+orig);
	if(header.indexOf("text/plain")>0) {
		if(debug) console.log("OUT DECODED",window.atob(orig));
		$('#outData').html(window.atob(orig));
	} else if(header.indexOf("image/jpeg")>0) {
		$('#inData').html("<img src='"+header+orig+"'>");
	}
}

function dec2bin(dec){
	return (dec >>> 0).toString(2);
}

function resizeCanvas(data) {
	var pixels = Math.ceil(data.length/3);
	var size = Math.ceil(Math.sqrt(pixels));

	if(size>1024) {
		size = 1024;
		$('#warning').show();
	} else {
		$('#warning').hide();
	}

	var canvas = $('#steg')[0];
	var ct = canvas.getContext('2d');
	ct.canvas.width = size;
	ct.canvas.height = size;
}

function putDataIntoCanvas(str) {
	if(debug) console.log("IN base256:",str,str.length);
	var canvas = $('#steg')[0];
	var ct = canvas.getContext('2d');
	var dim = $('#steg').width();

	ct.clearRect(0, 0, dim, dim);

	var image = ct.getImageData(0,0,dim,dim);
	var data = image.data; //RGBARGBARGBA....

	var max1 = data.length;
	var max2 = str.length;

	for (var i = 0; i < max1; i++) {
		if((i+1)%4==0) {
			data[i] = 255; //alpha channel has to bet 255 otherwise the other channels get modifed when writing to canvas
			//hopefully the PNG is saved without the alpha channel for space savings
		} else {
			var index = i-Math.floor(i/4);
			if(index<max2) {
				var c = str.charCodeAt(index);
				if(!isNaN(c) && c<256) data[i] = c;
				else console.log("!data loss",index,str.substr(index,1),c);
			} else {	
				data[i]=61;
			}
		}
	}

	if(debug) console.log("IN PIXELS:",data,data.length,dim,dim);
	ct.putImageData(image,0,0);		
}


function bug() {
	var canvas = $('#steg')[0];
	var ct = canvas.getContext('2d');
	var image = ct.getImageData(0,0,1,1);
	var data = image.data;

	data[0] = 200; //r
	data[1] = 100; //g
	data[2] = 50; //b
 	data[3] = 0; //a   If this is set, the rgb fields may get altered
	
	console.log(data); //[200, 100, 50, 25]

	ct.putImageData(image,0,0);
	var debug = ct.getImageData(0,0,1,1);

	console.log(debug.data); //[204, 102, 51, 25]
}