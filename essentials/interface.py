from remembrall import Remembrall
import re

output_replacements = (
	('me', 'you'),
	('my', 'your'),
	('mine', 'yours'),
)

def output(s):
	for a, b in output_replacements:
		s = s.replace(a, b)
	return s

if __name__ == '__main__':
	remembrall = Remembrall()
	remember_pattern = re.compile('remember that (?P<statement>.*)', flags=re.I)
	line = ''
	while line not in ('exit', 'quit'):
		line = ' '.join(input('\n>> ').strip().split())
		remember_match = remember_pattern.match(line)
		if remember_match:
			statement = remember_match.group('statement')
			remembrall.remember(statement)
			print("Remembered that %s" % statement)
		else:
			print(output(remembrall.recall(line)))