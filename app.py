import tcping
import json
from flask import Flask, render_template, request, abort, make_response
from utils import get_all_races, get_race
# from firebase_interaction import *

app = Flask(__name__, static_folder="public/static", template_folder="public")



@app.route('/', methods=['GET', 'POST'])
def index():
    errors = []
    focused_server = None

    try:
        if (request.args.get('ip') is not None) and (request.args.get('port') is not None):
            focused_server = get_race(request.args.get('ip'), request.args.get('port'))
    
    except Exception as e:
        print(e)
        errors.append(e)
    
    return render_template('index.html', errors=errors, focused_server=focused_server)


@app.route('/get_race_list', methods=['GET', 'POST'])
def send_race_list():
    update = True
    if request.args.get('dontupdate') is not None:
        update = False
    
    races = get_all_races(update)
    if races is not None:
        return json.dumps([race.__dict__ for race in races])
    else:
        return json.dumps(['A required RaceRoom service is temporarily down, this website will go back up once RaceRoom fixes that issue.'])

@app.route('/get_race', methods=['GET', 'POST'])
def send_race():
    race = None
    try:
        update = False
        if request.args.get('update') is not None:
            update = True
        
        race = get_race(request.args.get('ip'), request.args.get('port'), update)
    except Exception as e:
        print(e)
    if race is not None:
        return json.dumps(race.__dict__)
    else:
        return json.dumps(["closed"])

@app.route('/tcping')
def ping():
    try:
        if (request.args.get('host') is not None) and (request.args.get('port') is not None):
            host = request.args.get('host')
            port = request.args.get('port')
            return json.dumps(tcping.ping(host, port))
    except Exception as e:
        print(e)




@app.route('/batch_request', methods=['POST'])
def batch():
    """
    Execute multiple requests, submitted as a batch.

    :statuscode 207: Multi status
    """
    try:
        requests = json.loads(request.data)
    except ValueError as e:
        abort(400)

    responses = []

    for index, req in enumerate(requests):
        method = req['method']
        path = req['path']
        body = req.get('body', None)

        with app.app_context():
            with app.test_request_context(path, method=method, data=body):
                try:
                    # Can modify flask.g here without affecting flask.g of the root request for the batch

                    # Pre process Request
                    rv = app.preprocess_request()

                    if rv is None:
                        # Main Dispatch
                        rv = app.dispatch_request()

                except Exception as e:
                    rv = app.handle_user_exception(e)

                response = app.make_response(rv)

                # Post process Request
                response = app.process_response(response)

        # Response is a Flask response object.
        # _read_response(response) reads response.response and returns a string. If your endpoints return JSON object,
        # this string would be the response as a JSON string.
        responses.append({
            "status": response.status_code,
            "response": json.loads(response.response[0].decode('utf-8'))
        })

    return make_response(json.dumps(responses), 207)


if __name__ == '__main__':
    app.run()

