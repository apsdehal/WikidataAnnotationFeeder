var fs = require('fs');

fs.readFile( 'data.txt', function(err, data) {
	if(err)
		throw err;
	var html = '';
	html += '<table>';
	html += '<tr><th>Date of Birth</th><th>Date of Death</th><th>Name of artist</th>';
	data = data.toString();
	var dataLine = data.split('\n');
	dataLine.pop();
	dataLine.map(function(item){
		var nameAndDates = item.split(')');
		var dates = nameAndDates[0].split('-');
		dates[0] = dates[0].split('(')[1];
		html += '<tr><td>';
		html +=	dates[0];
		html += '</td><td>';
		html += dates[1];
		html += '</td><td>';
		html += nameAndDates[1];
		html += '</td>';
		html += '</tr>';
	});
	html += '</table>';
	fs.writeFile('final.html', html, function(err){
		if(err)
			throw err;
		console.log('done');
	});
});