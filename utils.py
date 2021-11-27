import datetime, ssl
import urllib.request, json, time, os
from datetime import datetime, timedelta
import grequests
import requests_cache

SESSION = requests_cache.CachedSession("players_cache", expire_after=timedelta(days=1))
SHORT_SESSION = requests_cache.CachedSession("short_players_cache", expire_after=timedelta(hours=1))


CONTEXT = ssl._create_unverified_context()


SESSIONS = {
    0 : "Practice",
    256 : "Qualify",
    768 : "Race",
    769 : "Race #1",
    770 : "Race #2",
    771 : "Race #3"
}

LEVELS = {
    0 : {
        0 : "Rookie",
        75 : "Amateur",
        80 : "Pro",
        85 : "Elite",
    },
    1700 : {
        85 : "Gold",
    },
}

MULTIPLIERS = {
    0 : "Disabled",
    1 : "1x",
    2 : "2x",
    3 : "3x",
    4 : "4x",
}

MANDATORY_PIT = {
    True : "Enabled",
    False : "Disabled",
}

CUT_RULES = {
    0 : "None",
    1 : "Slow Down",
    # 2 : "Drive Through Penalty" (?)
}



DB_LOCATION = "./db"
# RATINGS_FILE = "ratings.json"
R3E_FILE = "r3e-data.json"
SMALL_R3E_FILE = "r3e_small.json"
SERVERS_FILE = "servers.json"
# SMALL_PLAYERS_FILE = "players_small.json"

# RATINGS_PATH = os.path.join(DB_LOCATION, RATINGS_FILE)
R3E_PATH = os.path.join(DB_LOCATION, R3E_FILE)
R3E_DB = None
SMALL_R3E_PATH = os.path.join(DB_LOCATION, SMALL_R3E_FILE)
SERVERS_PATH = os.path.join(DB_LOCATION, SERVERS_FILE)
# SMALL_PLAYERS_PATH = os.path.join(DB_LOCATION, SMALL_PLAYERS_FILE)


def load_r3e_db():
    global R3E_DB
    f = open(R3E_PATH, encoding="utf-8")
    R3E_DB = f.read()
    f.close()

    R3E_DB = R3E_DB[R3E_DB.find("\n"):]
    R3E_DB = json.loads(R3E_DB)

    return R3E_DB

def update_local_db(update_full_every=3, reset_small_every="friday"):
    """
    update_full_every - update full databse every ${update_full_every} days.
    reset_small_every - reset small database evrey ${reset_small_every}.
    """
    global R3E_DB

    now = int(time.time())

    if not os.path.isdir("db"):
        os.mkdir("db")

    # Users DB:

    # if os.path.isfile(RATINGS_PATH):
    #     f = open(RATINGS_PATH, encoding="utf-8")
    #     content = f.read()
    #     f.close()

    #     last_save = int(content.split()[0])

    #     diff = (now - last_save) / (60*60*24)
    

    # if (not os.path.isfile(RATINGS_PATH)) or diff > update_full_every:
    #     with urllib.request.urlopen("https://game.raceroom.com/multiplayer-rating/ratings.json", context=CONTEXT) as web_data:
    #         data = web_data.read().decode()
    #         f = open(RATINGS_PATH, "w", encoding="utf-8")
    #         f.write(f"{now}\n" + data)
    #         f.close()
    
    
    # Content DB:

    if os.path.isfile(R3E_PATH):
        f = open(R3E_PATH, encoding="utf-8")
        content = f.read()
        f.close()

        last_save = int(content.split()[0])

        diff = (now - last_save) / (60*60*24)
    

    if (not os.path.isfile(R3E_PATH)) or diff > update_full_every:
        with urllib.request.urlopen("https://raw.githubusercontent.com/sector3studios/r3e-spectator-overlay/master/r3e-data.json", context=CONTEXT) as web_data:
            data = web_data.read().decode()
            f = open(R3E_PATH, "w", encoding="utf-8")
            f.write(f"{now}\n" + data)
            f.close()

            R3E_DB = json.loads(data)
    

    # Small DBs:

    # if datetime.today().strftime('%A').lower == reset_small_every or (not os.path.isfile(SMALL_PLAYERS_PATH)):
    #     f = open(SMALL_PLAYERS_PATH, "w")
    #     f.write("[]")
    #     f.close()
    
    if datetime.today().strftime('%A').lower == reset_small_every or (not os.path.isfile(SMALL_R3E_PATH)):
        f = open(SMALL_R3E_PATH, "w")
        f.write(json.dumps({"cars":dict(), "classes":dict(), "tracks":dict()}))
        f.close()


def get_player_data_old(pid):
    """
    pid - player Id.

    returns: dict with the following keys - "UserId", "Username", "Fullname", "Rating", "ActivityPoints", "RacesCompleted", "Reputation", "Country", "Team"
    """

    f = open(SMALL_PLAYERS_PATH, encoding="utf-8")
    small_db = f.read()
    f.close()

    small_db = json.loads(small_db)
    
    for user_data in small_db:
        if user_data["UserId"] == pid:
            return user_data


    f = open(RATINGS_PATH, encoding="utf-8")
    db = f.read()
    f.close()

    db = db[db.find("\n")+1:]
    db = json.loads(db)
    
    for user_data in db:
        if user_data["UserId"] == pid:
            small_db.append(user_data)

            f = open(SMALL_PLAYERS_PATH, "w", encoding="utf-8")
            f.write(json.dumps(small_db))
            f.close()
            
            return user_data


def get_player_data(pid):
    """
    pid - player Id.

    returns: dict with the following keys - "UserId", "Username", "Fullname", "Rating", "ActivityPoints", "RacesCompleted", "Reputation", "Country", "Team"
    """

    with urllib.request.urlopen(f"https://game.raceroom.com/multiplayer-rating/user/{pid}.json", context=CONTEXT) as data:
        return json.loads(data.read().decode())


def get_players(pids):
    urls = [f"https://game.raceroom.com/multiplayer-rating/user/{pid}.json" for pid in pids]
    requests = (grequests.get(u) for u in urls)
    results = grequests.map(requests)

    users = []
    for i, res in enumerate(results):
        try:
            users.append(res.json())
        except Exception as e:
            with urllib.request.urlopen(f"https://game.raceroom.com/utils/user-info/{pids[i]}", context=CONTEXT) as data:
                user = json.loads(data.read().decode())
                new_data = {"UserId": pids[i], "Username": user["username"], "Fullname": user["name"], "Rating": 1500, "ActivityPoints": 0, "RacesCompleted": 0, "Reputation": 70, "Country": user["country"]["code"].upper(), "Team": user["team"]}
                users.append(new_data)
    return users


def get_players_cached(pids):
    urls = [f"https://game.raceroom.com/multiplayer-rating/user/{pid}.json" for pid in pids]
    requests = (grequests.get(u, session=SESSION) for u in urls)
    results = grequests.map(requests)
    # results = (SESSION.get(u) for u in urls)

    users = []
    for i, res in enumerate(results):
        try:
            user_json = res.json()
            users.append(user_json)
        except Exception as e:
            user = SHORT_SESSION.get(f"https://game.raceroom.com/utils/user-info/{pids[i]}").json()
            new_data = {"UserId": pids[i], "Username": user["username"], "Fullname": user["name"], "Rating": 1500, "ActivityPoints": 1, "RacesCompleted": 0, "Reputation": 70, "Country": user["country"]["code"].upper(), "Team": user["team"]}
            users.append(new_data)
    return users# + ([{"UserId": 123, "Username": "hi", "Fullname": "hello", "Rating": 2500, "ActivityPoints": 1, "RacesCompleted": 0, "Reputation": 70, "Country": "IL", "Team": "https://www.twitch.tv/dan_suzuki"}])

def get_car_data_by_livery(lid):
    """
    lid - livery Id.

    returns: car, car_class dicts.
    """


    f = open(SMALL_R3E_PATH, encoding="utf-8")
    small_db = f.read()
    f.close()

    small_db = json.loads(small_db)

    car = None

    for car_id in small_db["cars"]:
        for livery in small_db["cars"][car_id]["liveries"]:
            if livery["Id"] == lid:
                car = small_db["cars"][car_id]
                break
    
    if car != None and str(car["Class"]) in list(small_db["classes"].keys()):
        car_class = small_db["classes"][str(car["Class"])]

    else:

        f = open(R3E_PATH, encoding="utf-8")
        db = f.read()
        f.close()

        db = db[db.find("\n")+1:]
        db = json.loads(db)


        def livery_find_loop():
            for car_id in db["cars"]:
                for livery in db["cars"][car_id]["liveries"]:
                    if livery["Id"] == lid:
                        return db["cars"][car_id], car_id

        car, car_id = livery_find_loop()
        if car is None:
            update_local_db(update_full_every=0)
            car, car_id = livery_find_loop()
        
        car_class = db["classes"][str(car["Class"])]

        small_db["cars"][car_id] = car
        small_db["classes"][str(car["Class"])] = car_class

        f = open(SMALL_R3E_PATH, "w", encoding="utf-8")
        f.write(json.dumps(small_db))
        f.close()

    return car, car_class


def get_livery(lid):
    """
    lid - livery Id.

    returns: livery dict.
    """

    f = open(SMALL_R3E_PATH, encoding="utf-8")
    small_db = f.read()
    f.close()

    small_db = json.loads(small_db)

    for car_id in small_db["cars"]:
        for livery in small_db["cars"][car_id]["liveries"]:
            if livery["Id"] == lid:
                return livery



    f = open(R3E_PATH, encoding="utf-8")
    db = f.read()
    f.close()

    db = db[db.find("\n")+1:]
    db = json.loads(db)

    for car_id in db["cars"]:
        for livery in db["cars"][car_id]["liveries"]:
            if livery["Id"] == lid:
                small_db["cars"][car_id] = db["cars"][car_id]

                f = open(SMALL_R3E_PATH, "w", encoding="utf-8")
                f.write(json.dumps(small_db))
                f.close()

                return livery


def get_track_layout_data(tid):
    """
    lid - track layout Id.

    returns: track, track_layout dicts.
    """

    f = open(SMALL_R3E_PATH, encoding="utf-8")
    small_db = f.read()
    f.close()

    small_db = json.loads(small_db)

    for track_id in small_db["tracks"]:
        for layout in small_db["tracks"][track_id]["layouts"]:
            if layout["Id"] == tid:
                track = small_db["tracks"][track_id]
                return track, layout
    

    

    f = open(R3E_PATH, encoding="utf-8")
    db = f.read()
    f.close()

    db = db[db.find("\n")+1:]
    db = json.loads(db)

    for track_id in db["tracks"]:
        for layout in db["tracks"][track_id]["layouts"]:
            if layout["Id"] == tid:
                track = db["tracks"][track_id]

                small_db["tracks"][track_id] = track

                f = open(SMALL_R3E_PATH, "w", encoding="utf-8")
                f.write(json.dumps(small_db))
                f.close()


                return track, layout


def name_as_path(name):
    return name.lower().replace(' ', '-').replace('ü', 'u').replace('å', 'a').replace('ó', 'o').replace('é', 'e').replace('á', 'a').replace('í', 'i').replace('ö', 'o').replace('ç', 'c').replace('ñ', 'n')



class Race:
    def __init__(self, data):
        self.data = data["Server"]
        self.ip = self.data["ServerIp"]
        self.port = self.data["Port"]
        self.name = self.data["Settings"]["ServerName"]
        self.thumbnail = self.data["Settings"]["Thumbnail"]
        self.track_layout_id = self.data["Settings"]["TrackLayoutId"][0]
        self.livery_ids = self.data["Settings"]["LiveryId"]
        self.player_ids = self.data["Players"]

        self.p_duration = self.data["Settings"]["PracticeDuration"]
        self.q_duration = self.data["Settings"]["QualifyDuration"]
        self.r_duration = [self.data["Settings"][f"Race{i+1}Duration"] for i in range(3) if self.data["Settings"][f"Race{i+1}Duration"] != 0]

        self.session = SESSIONS[self.data["CurrentSession"]]
        if len(self.r_duration) > 1 and self.session == "Race":
            self.session += " #1"
        

        if self.data["Settings"]["MinRating"] in LEVELS:
            self.level = LEVELS[self.data["Settings"]["MinRating"]][self.data["Settings"]["MinReputation"]]
        else:
            self.level = LEVELS[0][self.data["Settings"]["MinReputation"]]
        
        self.time_left_string = time.strftime('%M:%S', time.gmtime(self.data["TimeLeft"]//1000))
        self.time_left = self.data["TimeLeft"]//1000
        

        self.tire_wear = MULTIPLIERS[self.data["Settings"]["TireWear"]]
        self.fuel_usage = MULTIPLIERS[self.data["Settings"]["FuelUsage"]]
        self.mandatory_pit_stop = MANDATORY_PIT[self.data["Settings"]["MandatoryPitStop"]]
        self.cut_rules = CUT_RULES[self.data["Settings"]["CutRules"]]

        self.players = None
        self.player_countries_thumbnails = None
        self.track_logo = None
        self.track_thumbnail = None
        self.track_map = None
        self.track, self.track_layout = None, None
        self.first_livery = None
        self.car_thumbnail = None
        self.classes_thumbnails = []
        self.cars, self.car_classes = None, None
        


    def get_extra_data(self):
        if self.players is None:
            self.get_player_data()
        if self.track is None:
            self.get_track_data()
        if self.first_livery is None:
            self.get_first_livery()
        if self.cars is None:
            self.get_car_data()


    def get_player_data(self):
        # player_data = [get_player_data(pid) for pid in self.player_ids]
        player_data = get_players_cached(self.player_ids)

        # if any([p is None for p in player_data]):
        #     update_local_db(update_full_every=0)
        #     player_data = [get_player_data(pid) for pid in self.player_ids]
            
        

        player_data = [p for p in player_data if p is not None]
        

        self.players = player_data

        ratings = [i["Rating"] for i in self.players]
        reps = [i["Reputation"] for i in self.players]

        if len(ratings) > 0:
            self.sof = sum(ratings) / len(ratings)
            self.rep = sum(reps) / len(reps)
        else:
            self.sof = 0
            self.rep = 0

        return player_data


    def get_track_data(self):
        self.track, self.track_layout = get_track_layout_data(self.track_layout_id)
        # self.track_thumbnail = f"https://prod.r3eassets.com/assets/content/track/{name_as_path(self.track['Name'])}-{self.track['Id']}-signature-original.webp"
        self.track_thumbnail = f"https://prod.r3eassets.com/assets/content/track/{name_as_path(self.track['Name'])}-{self.track['Id']}-image-full.webp"
        self.track_logo = f"https://prod.r3eassets.com/assets/content/track/{name_as_path(self.track['Name'])}-{self.track['Id']}-logo-original.webp"
        self.track_map = f"https://prod.r3eassets.com/assets/content/tracklayout/{name_as_path(self.track['Name'])}-{name_as_path(self.track_layout['Name'])}-{self.track_layout['Id']}-image-small.webp"
        return self.track, self.track_layout


    def get_first_livery(self):
        self.first_livery = get_livery(self.livery_ids[0])
        self.car_thumbnail = f"https://prod.r3eassets.com/assets/content/carlivery/{name_as_path(self.first_livery['TeamName'])}-{self.first_livery['Name'][1:]}-{self.first_livery['Id']}-image-big.webp"


    def get_car_data(self):
        self.cars, self.car_classes = [], []
        car_names, car_classes_names = set(), set()

        found_liveries = set()

        if R3E_DB is None:
            load_r3e_db()
        
        for lid in self.livery_ids:
            if lid not in found_liveries:
                car, car_class = get_car_data_by_livery(lid)

                # f = open(R3E_PATH, encoding="utf-8")
                # db = f.read()
                # f.close()

                # db = db[db.find("\n"):]
                # db = json.loads(db)

                for car_id in car_class["Cars"]:
                    car_id = str(car_id["Id"])
                    liveries = R3E_DB["cars"][car_id]["liveries"]
                    
                    for livery in liveries:
                        found_liveries.add(livery["Id"])
                

                if car["Name"] not in car_names:
                    self.cars.append(car)
                    car_names.add(car["Name"])
                
                if car_class["Name"] not in car_classes_names:
                    self.car_classes.append(car_class)
                    car_classes_names.add(car_class["Name"])

                    self.classes_thumbnails.append(f"https://prod.r3eassets.com/assets/content/carclass/{car_class['Name'].lower().replace(' ', '-')}-{car_class['Id']}-image-small.webp")
        
        
        return self.cars, self.car_classes

def update_local_servers():
    with urllib.request.urlopen("https://game.raceroom.com/multiplayer-rating/servers/", context=CONTEXT) as web_data:
        res = json.loads(web_data.read().decode())["result"]

        f = open(SERVERS_PATH, "w")
        f.write(json.dumps(res))
        f.close()

        return res


def get_local_servers():
    if os.path.isfile(SERVERS_PATH):
        f = open(SERVERS_PATH, encoding="utf-8")
        content = f.read()
        f.close()
        return json.loads(content)
    else:
        return update_local_servers()


def get_all_races():
    update_local_db()

    # with urllib.request.urlopen("https://game.raceroom.com/multiplayer-rating/servers/", context=CONTEXT) as web_data:
    #     ranked = json.loads(web_data.read().decode())["result"]

    ranked = update_local_servers()

    races = []
    for i in ranked:
        race = Race(i)
        race.get_track_data()
        race.get_first_livery()
        race.get_car_data()
        races.append(race)
    
    return sorted(races, key = lambda x: len(x.player_ids))[::-1]


def get_race(ip, port):
    port = int(port)
    update_local_db()

    # with urllib.request.urlopen("https://game.raceroom.com/multiplayer-rating/servers/", context=CONTEXT) as web_data:
    #     ranked = json.loads(web_data.read().decode())["result"]
    ranked = get_local_servers()

    for i in ranked:
        if i["Server"]["ServerIp"] == ip and i["Server"]["Port"] == port:
            race = Race(i)
            race.get_extra_data()
            
            return race



def parse_race_name(name):
    return name.replace("_", " ").replace("--h--", "#").replace("--p--", "+")