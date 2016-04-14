var dimensions = 0;

$(document).ready(function() {
	$('#fileInput').on('change', newFile);

	//var demo = demoData();
	//render("This is random data:",demo);
});

function render(header,data) {
	resizeCanvas(header,data);
	putDataIntoCanvas(header,data);
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
	console.log(url);
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
			var b64Start = fileData.lastIndexOf(",")+1;
			var b64Header = fileData.substr(0,b64Start)
			console.log("Orig base64",b64Header,fileData.substr(b64Start));

			var fileData = compressBase64(fileData.substr(b64Start));
			render(b64Header,fileData);
		}
	};
	reader.readAsDataURL(file); //Base64
}

function compressBase64(base64) {
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
	console.log(imageData);

	var img = $('#imageIn')[0];
	img.src = imageData;

	var canvas = $('#temp')[0];
	// var canvas = document.createElement('canvas');
	var ct = canvas.getContext('2d');
	ct.canvas.width = img.width;
	ct.canvas.height = img.height;
	ct.clearRect(0, 0, img.width, img.height);

	ct.drawImage(img,0,0);
	var image = ct.getImageData(0,0,img.width,img.height);
	var data = image.data;
	console.log(data);

	var str = "";
	var header = "";
	for (var i = 0; i < data.length; i++) {
		var c = data[i];
		if(i<img.width*4) header += String.fromCharCode(c);
		str += String.fromCharCode(c);
	}

	console.log("Final Base256",header,str);
	var orig = uncompressBase256(str);
	console.log("Final Base64",header,orig);

}

function dec2bin(dec){
	return (dec >>> 0).toString(2);
}

function resizeCanvas(header,data) {
	var pixels = Math.ceil(data.length/4);
	var size = Math.ceil(Math.sqrt(pixels));
	if(size<header.length) size = header.length;

	if(size>1024) {
		size = 1024;
		$('#warning').show();
	} else {
		$('#warning').hide();
	}

	var canvas = $('#steg')[0];
	var ct = canvas.getContext('2d');
	ct.canvas.width = size;
	ct.canvas.height = size+1;
}

function putDataIntoCanvas(header,str) {
	console.log("Orig base256",header,"=",str);
	var canvas = $('#steg')[0];
	var ct = canvas.getContext('2d');
	var dim = $('#steg').width();

	ct.clearRect(0, 0, dim, dim+1);

	var image = ct.getImageData(0,0,dim,dim+1);
	var data = image.data; //RGBARGBARGBA....

	var max1 = data.length;
	var max2 = str.length;
	var max3 = header.length;
	var offset = dim*4;
	for (var i = 0; i < dim*4 && i < max3; i++) { //write header
		var c = header.charCodeAt(i);
		if(!isNaN(c) && c<256) data[i] = c;
		else console.log("!data loss",i,c);
	}

	for (var j = 0; j < max1 && j < max2; j++) { //write data
		var c = str.charCodeAt(j);
		if(!isNaN(c) && c<256) data[j+offset] = c;
		else console.log("!data loss",j,c);
	}

	console.log(data);

	ct.putImageData(image,0,0);
}