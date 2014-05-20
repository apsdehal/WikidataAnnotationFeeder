#! /usr/bin/python
import os, sys, re

json = sys.argv[1]

json = os.path.basename(json) 

json = open(json, 'r')

lines = json.readlines()

result = sys.argv[2]

result = open(result, 'w+') 

def setFwdBwd(lines, i):
	prev = lines[i-1]
	try:
		next = lines[i+1]
	except:
		next = ''	
	current = lines[i]
	return (prev, next, current)

def getSplits( line ):
		split = line.split(":", 1)
		return (split[0],split[1])
def getBWCommas( part ):
	return re.findall(r'"(.*?)"', part)[0]		
i = 0
data = '"items": [\n'
while i < len(lines):
	(prev, next, current) = setFwdBwd(lines, i)
	if current.find('"id"') != -1:
		data += '\t{\n'
		data += '\t\t"type": ["predicate"],\n'
		data += '\t\t"rdftype": ["http://www.w3.org/1999/02/22-rdf-syntax-ns#Property"],\n'
		(first, second) = getSplits(current)
		propid = getBWCommas(second)
		while current.find('"descriptions": {') == -1:
			i = i + 1
			(prev, next, current) = setFwdBwd(lines, i)
		data += '\t\t"description":'
		i = i +3
		(prev, next, current) = setFwdBwd(lines, i)
		(first, second) = getSplits(current)
		second = second.strip('\n')
		if second == ' {':
			data += ' [],\n'
		else:
			data += second + ',\n'			
		while current.find('"labels": {') == -1:
			i = i + 1
			(prev, next, current) = setFwdBwd(lines, i)
		data += '\t\t"label":'
		i = i + 3
		(prev, next, current) = setFwdBwd(lines, i)
		(first, second) = getSplits(current)
		data += second.strip('\n') + ',\n'
		data += '\t\t"domain": [],\n'				
		data += '\t\t"range": [],\n'				
		data += '\t\t"value": "http://wikidata.org/wiki/Property:' + propid + '"'
		data += '\n\t},\n'
	i = i + 1
data += '\n]'
result.write(data)
result.close()
json.close()
