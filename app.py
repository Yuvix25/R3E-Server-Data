import json, threading
from flask import Flask, render_template, request
from utils import get_all_races, get_race, parse_race_name
# from firebase_interaction import *

app = Flask(__name__)



@app.route('/', methods=['GET', 'POST'])
def index():
    errors = []
    servers = []
    focused_server = None

    try:
        # servers = get_all_races()
        if (request.args.get('ip') is not None) and (request.args.get('port') is not None):
            # focused_server = get_race(parse_race_name(request.args.get('name')))
            focused_server = get_race(request.args.get('ip'), request.args.get('port'))
        
    except Exception as e:
        print(e)
        errors.append(e)
    
    return render_template('index.html', errors=errors, focused_server=focused_server)

# @app.route('/user_history', methods=['GET', 'POST'])
# def user_history():
#     errors = []
#     data = []

#     try:
#         data = get_user_data()
#     except Exception as e:
#         print(e)
#         errors.append(e)

#     return render_template('user_history.html', errors=errors, data=data)


@app.route('/get_race_list', methods=['GET', 'POST'])
def send_race_list():
    update = True
    if request.args.get('dontupdate') is not None:
        update = False
    
    return json.dumps([race.__dict__ for race in get_all_races(update)])

@app.route('/get_race', methods=['GET', 'POST'])
def send_race():
    # return json.dumps(get_race(parse_race_name(request.args.get('name'))).__dict__)
    race = None
    try:
        update = False
        if request.args.get('update') is not None:
            update = True
        
        race = get_race(request.args.get('ip'), request.args.get('port'), update)
    except Exception as e:
        print(e)
    if race is not None:
        # t = threading.Thread(target=update_user_data, args=(race.players,))
        # t.start()
        return json.dumps(race.__dict__)
    else:
        return json.dumps(["closed"])


if __name__ == '__main__':
    app.run()

