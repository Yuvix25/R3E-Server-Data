import json
from flask import Flask, render_template, request
from utils import get_all_races, get_race


app = Flask(__name__)



@app.route('/', methods=['GET', 'POST'])
def index():
    errors = []
    servers = []
    focused_server = None

    try:
        # servers = get_all_races()
        if request.args.get('name') is not None:
            focused_server = get_race(request.args.get('name').replace("-", " ")[:-1] + "#" + request.args.get('name').replace("-", " ")[-1])
        
    except Exception as e:
        print(e)
        errors.append(e)
    
    return render_template('index.html', errors=errors, focused_server=focused_server)



@app.route('/get_race_list', methods=['GET', 'POST'])
def send_race_list():
    return json.dumps([race.__dict__ for race in get_all_races()])

@app.route('/get_race', methods=['GET', 'POST'])
def send_race():
    return json.dumps(get_race(request.args.get('name').replace("-", " ")[:-1] + "#" + request.args.get('name').replace("-", " ")[-1]).__dict__)


if __name__ == '__main__':
    app.run()

