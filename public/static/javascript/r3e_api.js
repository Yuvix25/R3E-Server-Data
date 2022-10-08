/* global xhrCache */

/**
 * @typedef {object} PlayerData
 * @property {number} UserId
 * @property {string} Username
 * @property {string} Fullname
 * @property {number} Rating
 * @property {number} Reputation
 * @property {number} ActivityPoints
 * @property {number} RacesCompleted
 * @property {string} Country
 * @property {string} Team
 */

/**
 * @typedef {object} CarLivery
 * @property {string} Name
 * @property {number} Team
 * @property {number} Car
 * @property {number} Id
 * @property {number} Class
 * @property {string} TeamName
 * @property {object[]} drivers
 * @property {string} drivers[].Forename
 * @property {string} drivers[].Surname
 * @property {number} drivers[].Id
 */
/**
 * @typedef {object} Car
 * @property {string} Name
 * @property {string} BrandName
 * @property {number} CarManufacturer
 * @property {number} DefaultLivery
 * @property {number} Id
 * @property {number} Class
 * @property {CarLivery[]} liveries
 */
/**
 * @typedef {object} CarClass
 * @property {string} Name
 * @property {number} Id
 * @property {object[]} Cars
 * @property {number} Cars[].Id
 */

/**
 * @typedef {object} TrackLayout
 * @property {string} Name
 * @property {number} Track
 * @property {number} MaxNumberOfVehicles
 * @property {number} Id
 */
/**
 * @typedef {object} Track
 * @property {string} Name
 * @property {number} Id
 * @property {TrackLayout[]} layouts
 */

/**
 * @typedef {object} ServerData
 * @property {number} Ping - never seen a case where this is not -1
 * @property {object} Server
 * @property {number} Server.CurrentSession
 * @property {number} Server.PlayersOnServer
 * @property {number} Server.Port
 * @property {string} Server.PortTimeCritical
 * @property {string} Server.ServerIp
 * @property {number} Server.TimeLeft
 * @property {number[]} Server.Players
 *
 * @property {object} Server.Settings
 * @property {number} Server.Settings.CutRules
 * @property {number} Server.Settings.Difficulty
 * @property {number} Server.Settings.ExperienceId
 * @property {number} Server.Settings.FlagRules
 * @property {number} Server.Settings.FuelUsage
 * @property {number} Server.Settings.TireWear
 * @property {boolean} Server.Settings.HasPassword
 * @property {number} Server.Settings.Id
 * @property {boolean} Server.Settings.IsRanked - always true here
 * @property {boolean} Server.Settings.MandatoryPitStop
 * @property {number} Server.Settings.MaxNumberOfPlayers
 * @property {number} Server.Settings.MechanicalDamage
 * @property {number} Server.Settings.MinRating
 * @property {number} Server.Settings.MinReputation
 * @property {number} Server.Settings.PracticeDuration
 * @property {number} Server.Settings.QualifyDuration
 * @property {number} Server.Settings.QualifyStartMode
 * @property {number} Server.Settings.Race1Duration
 * @property {number} Server.Settings.Race2Duration
 * @property {number} Server.Settings.Race3Duration
 * @property {number} Server.Settings.ReverseGridPlaces
 * @property {string} Server.Settings.ServerName
 * @property {string} Server.Settings.Thumbnail
 * @property {number[]} Server.Settings.TrackLayoutId
 * @property {number[]} Server.Settings.LiveryId
 *
 * @property {object} Server.Settings.DriveAssists
 * @property {number} Server.Settings.DriveAssists.Autopit
 * @property {number} Server.Settings.DriveAssists.BrakeAssist
 * @property {number} Server.Settings.DriveAssists.Esp
 * @property {number} Server.Settings.DriveAssists.Preset
 * @property {number} Server.Settings.DriveAssists.Raceline
 * @property {number} Server.Settings.DriveAssists.SteerAssist
 * @property {number} Server.Settings.DriveAssists.TractionControl
 * @property {number} Server.Settings.DriveAssists.Transmission
 */

/**
 * @typedef R3EData
 * @property {Car[]} cars
 * @property {CarClass[]} classes
 * @property {Track[]} tracks
 */

const SESSIONS = {
  0: "Practice",
  256: "Qualify",
  768: "Race",
  769: "Race #1",
  770: "Race #2",
  771: "Race #3",
};

const LEVELS = {
  0: "Rookie",
  75: "Amateur",
  80: "Pro",
};

const MULTIPLIERS = {
  0: "Disabled",
  1: "1x",
  2: "2x",
  3: "3x",
  4: "4x",
};

const MANDATORY_PIT = {
  True: "Enabled",
  False: "Disabled",
};

const CUT_RULES = {
  0: "None",
  1: "Slow Down",
};

const R3E_DATA_URL = "https://raw.githubusercontent.com/sector3studios/r3e-spectator-overlay/master/r3e-data.json";
const DATA_EXPIRATION = 4; // days

/**
 * Get r3e-data.json, cached.
 * @param {number} [reload=false] - Force cache reload.
 * @return {Promise<R3EData>}
 */
async function getR3EDataCached(reload=false) {
  return JSON.parse(await xhrCache(R3E_DATA_URL, {
    method: "GET",
    ttl: 1000 * 60 * 60 * 24 * DATA_EXPIRATION,
    reload: reload,
  }));
}


/**
 * Get player ranked data.
 * @param {number[]} pids
 * @return {Promise<PlayerData[]>}
 */
async function getPlayersCached(pids) {
  const res = [];
  for (const pid of pids) {
    const url = `https://game.raceroom.com/multiplayer-rating/user/${pid}.json`;
    try {
      const requestResult = await xhrCache(url, {
        method: "GET",
        ttl: 1000 * 60 * 60 * 24, // 1 day
      });
      res.push(requestResult);
    } catch (e) { // 404 usually
      const userInfoUrl = `https://game.raceroom.com/utils/user-info/${pid}`;
      const user = await xhrCache(userInfoUrl, {
        method: "GET",
        ttl: 1000 * 60 * 60 * 24, // 1 day
      });

      res.push({
        UserId: pid,
        Username: user.username,
        Fullname: user.name,
        Rating: 1500,
        Reputation: 70,
        ActivityPoints: 1,
        RacesCompleted: 0,
        Country: user.country.code.toUpperCase(),
        Team: user.team,
      });
    }
  }
  return res;
}


/**
 * Call callback with database (from `getR3EDataCached()`).
 * If the callback returns undefined, reload the database and try again (once).
 * @param {function(string):T} callback
 * @return {Promise<{T, R3EData}>}
 */
async function getDataUpdateCache(callback) {
  let database = await getR3EDataCached();
  let data = callback(database);
  if (data === undefined) {
    database = await getR3EDataCached(true);
    data = callback(database);
    return {data, database};
  } else {
    return {data, database};
  }
}

/**
 * Get car object and class object by livery id.
 * @param {number} lid
 * @return {Promise<Car>}
 */
async function getCarDataByLivery(lid) {
  const liveryFindLoop = (database) => {
    for (const carId of Object.keys(database.cars)) {
      if (database.cars[carId].liveries.some((livery) => livery.Id === lid)) {
        return database.cars[carId];
      }
    }
  };

  const {data: car} = await getDataUpdateCache(liveryFindLoop);
  return car;
}


/**
 * Get track layout by id.
 * @param {number} layoutId
 * @return {Promise<Track>}
 */
async function getTrackDataByLayout(layoutId) {
  const layoutFindLoop = (database) => {
    for (const trackId of Object.keys(database.tracks)) {
      if (database.tracks[trackId].layouts.some((layout) => layout.Id === layoutId)) {
        return database.tracks[trackId];
      }
    }
  };

  const {data: track} = await getDataUpdateCache(layoutFindLoop);
  return track;
}


/**
 * Convert track name to path includeable.
 * @param {string} name
 * @return {string}
 */
function nameAsPath(name) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").
      replaceAll(" ", "-").
      replaceAll("(", "").
      replaceAll(")", "");
}


/**
 * Ranked server.
 */
class RankedServer {
  /**
   * Construct RankedServer.
   * @param {ServerData} data
   */
  constructor(data) {
    this.data = data.Server;
    this.ip = this.data.ServerIp;
    this.port = this.data.Port;
    this.name = this.data.Settings.ServerName;
    this.thumbnail = this.data.Settings.Thumbnail;
    this.trackLayoutId = this.data.Settings.TrackLayoutId[0];
    this.liveryIds = this.data.Settings.LiveryId;
    this.playerIds = this.data.Players;

    this.practiceDuration = this.data.Settings.PracticeDuration;
    this.qauliDuration = this.data.Settings.QualifyDuration;
    this.raceDuration = Object.keys(this.data.Settings)
        .filter((key) => /^Race[123]Duration$/.test(key) && this.data.Settings[key])
        .map((key) => this.data.Settings[key]);

    this.session = SESSIONS[this.data.CurrentSession];
    this.minRating = this.data.Settings.MinRating;
    this.minReputation = this.data.Settings.MinReputation;
    if (!(this.minReputation in LEVELS)) {
      const outerThis = this;
      const closest = Object.keys(LEVELS).reduce(function(prev, curr) {
        return (Math.abs(curr - outerThis.minReputation) < Math.abs(prev - outerThis.minReputation) ? curr : prev);
      });
      this.level = LEVELS[closest];
    } else {
      this.level = LEVELS[this.minReputation];
    }

    this.timeLeft = this.data.TimeLeft / 1000;
    this.tireWear = MULTIPLIERS[this.data.Settings.TireWear];
    this.fuelUsage = MULTIPLIERS[this.data.Settings.FuelUsage];
    this.mandatoryPitStop = MANDATORY_PIT[this.data.Settings.MandatoryPitStop];
    this.cutRules = CUT_RULES[this.data.Settings.CutRules];

    this.players = null;
    this.trackLogo = null;
    this.trackThumbnail = null;
    this.trackMap = null;
    this.track = null;
    this.trackLayout = null;
    this.cars = null;
    this.carClasses = null;
    this.classesThumbnails = [];

    this.sof = 0; // Strength of Field
    this.rep = 0; // Average Reputation
  }

  /**
   * Load players, track, and car data.
   * @return {Promise<void>}
   */
  async getExtraData() {
    if (this.players === null) {
      await this.loadPlayerData();
    }
    if (this.track === null) {
      await this.loadTrackData();
    }
    if (this.cars === null) {
      await this.loadCarData();
    }
  }

  /**
   * Load player data.
   * @return {Promise<PlayerData[]>}
   */
  async loadPlayerData() {
    this.players = await getPlayersCached(this.playerIds);

    const ratings = this.players.map((player) => player.Rating);
    const reps = this.players.map((player) => player.Reputation);

    this.sof = Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length) || 0;
    this.rep = Math.round(reps.reduce((a, b) => a + b, 0) / reps.length) || 0;

    return this.players;
  }

  /**
   * Load track data.
   * @return {Promise<Track>}
   */
  async loadTrackData() {
    const track = await getTrackDataByLayout(this.trackLayoutId);
    if (track == undefined) {
      return undefined;
    }
    const trackLayout = track.layouts.find((layout) => layout.Id === this.trackLayoutId);
    if (trackLayout == undefined) {
      return undefined;
    }

    this.track = track;
    this.trackLayout = trackLayout;

    this.trackThumbnail = "https://prod.r3eassets.com/assets/content/track/" +
        `${nameAsPath(track.Name)}-${track["Id"]}-image-full.webp`;

    this.trackLogo = "https://prod.r3eassets.com/assets/content/track/" +
        `${nameAsPath(track.Name)}-${track["Id"]}-logo-original.webp`;

    this.trackMap = "https://prod.r3eassets.com/assets/content/tracklayout/" +
        `${nameAsPath(track.Name)}-${nameAsPath(trackLayout.Name)}-${trackLayout.Id}-image-small.webp`;

    return this.track;
  }

  /**
   * Load car data.
   * @return {Promise<Car[]>}
   */
  async loadCarData() {
    this.cars = [];
    this.carClasses = [];

    const carNames = new Set();
    const carClassesNames = new Set();
    const foundLiveries = new Set();

    const database = await getR3EDataCached();
    for (const liveryId of this.liveryIds) {
      if (!foundLiveries.has(liveryId)) {
        const car = await getCarDataByLivery(liveryId);
        const carClass = database.classes[car?.Class];
        if (car == undefined || carClass == undefined) {
          continue;
        }

        for (const car of carClass.Cars) {
          const liveries = database.cars[car.Id].liveries;
          liveries.forEach((livery) => foundLiveries.add(livery.Id));
        }

        if (!carNames.has(car.Name)) {
          this.cars.push(car);
          carNames.add(car.Name);
        }

        if (!carClassesNames.has(carClass.Name)) {
          this.carClasses.push(carClass);
          carClassesNames.add(carClass.Name);

          this.classesThumbnails.push("https://prod.r3eassets.com/assets/content/carclass/" +
              `${nameAsPath(carClass.Name)}-${carClass.Id}-image-small.webp`);
        }
      }
    }

    return this.cars;
  }
}


/**
 * Get cached server list.
 * @param {boolean} [reload=false] - reload list.
 * @return {Promise<ServerData[]>}
 */
async function getCachedServers(reload=true) {
  try {
    const cors = "https://api.allorigins.win/get?url=";
    const servers = await xhrCache(cors + encodeURI("https://game.raceroom.com/multiplayer-rating/servers/"), {
      method: "GET",
      reload: reload,
      cacheBust: true,
    }); // no ttl - never expire
    return JSON.parse(servers.contents).result;
  } catch (e) {
    console.error(e);
    return [];
  }
}

/**
 * Get array of current server objects, with loaded track and car data.
 * @param {boolean} reload
 * @return {Promise<RankedServer[]>}
 */
async function getAllServers(reload=true) { // eslint-disable-line no-unused-vars
  const servers = await getCachedServers(reload);
  const res = [];
  for (const server of servers) {
    const serverObject = new RankedServer(server);
    res.push(serverObject);
    await serverObject.loadTrackData();
    await serverObject.loadCarData();
  }
  return res;
}

/**
 * Get server by ip and port, loaded with all extra data.
 * @param {string} ip
 * @param {number} port
 * @param {boolean} reload
 * @return {Promise<RankedServer>}
 */
async function getServer(ip, port, reload=false) { // eslint-disable-line no-unused-vars
  const servers = await getCachedServers(reload);
  const server = servers.find((server) => server.Server.ServerIp === ip && server.Server.Port === port);
  if (server == undefined) {
    return undefined;
  }

  const serverObject = new RankedServer(server);
  await serverObject.getExtraData();
  return serverObject;
}

