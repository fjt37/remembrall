from bottle import request, response, route, run

@route('/test')
def handle():
	return "hello world"

run('localhost', port=80)