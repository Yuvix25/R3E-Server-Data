var initial_time_lefts = [];
var time_lefts = [];
var last_update_time = Date.now();

var sorted_races = [];
var focused_server;
var sidebar_opened = false;
var statics_url;

var slide_time;
var auto_refresh = false;

var race_list;



var refresh_activated_at = Date.now();
var started_at = Date.now();
var auto_refresh_every = 60; // seconds
var disable_after = 60; // minutes

function openTeamUrl(ev, url){
    console.log(url);
    window.open(url, '_blank').focus();
    ev.stopPropagation();
}

function urlify(text) {
    var urlRegex = /(http(s)?:\/\/)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/ig;
    return text.replace(urlRegex, function(url) {
        url_text = url;
        if (!url.startsWith("http")){
            url = "https://" + url;
        }
        return '<a class="link" href="#" onclick="openTeamUrl(event, \'' + url + '\');">' + url_text + '</a>';
    })
  }


function update_times(){
    var countdown = document.getElementById("sidebar-countdown");
    var auto_refresh_countdown = document.getElementById("auto-refresh-countdown");

    setInterval(async function() {
        
        if ((Date.now() - refresh_activated_at)/1000 > (disable_after*60) && auto_refresh) {
            document.getElementById("auto-refresh").checked = false;
            auto_refresh = false;
        }

        if (auto_refresh){
            auto_refresh_countdown.innerHTML = Math.floor(auto_refresh_every - (Date.now() - started_at)/1000) + "s";
            
            if (Math.floor((Date.now() - started_at)/1000) >= auto_refresh_every){
                started_at = Date.now();
                await applyFilters(true, true);

                if (sidebar_opened) {
                    var tmp_focused_server = await get_race(focused_server.ip, focused_server.port);
                    if (tmp_focused_server != undefined){
                        focused_server = tmp_focused_server;
                        if (sidebar_opened) {
                            open_race(focused_server, false, false);
                        }
                    }
                }
            }
        }
        else {
            auto_refresh_countdown.innerHTML = "";
            started_at = Date.now();
        }

        
        for (let i = 0; i < time_lefts.length; i++){
            if (time_lefts[i] < 0){
                time_lefts[i] = 0;
            }
            
            let minutes = Math.floor(time_lefts[i] / 60);
            let seconds = Math.floor(time_lefts[i]) % 60;

            minutes = ('00'+minutes).slice(-2);
            seconds = ('00'+seconds).slice(-2);


            if (i == countdown.dataset.raceIndex){
                document.getElementById("sidebar-minutes").innerHTML = minutes + ":";
                document.getElementById("sidebar-seconds").innerHTML = seconds;
            }

            try{
                document.getElementById("minutes-"+i).innerHTML = minutes + ":";
                document.getElementById("seconds-"+i).innerHTML = seconds;
            }
            catch {
            }
            

            time_lefts[i] = initial_time_lefts[i] - (Date.now() - last_update_time)/1000
        }
    
    }, 10)
}


function joinFocusedServer(){
    var url = 'rrre://multiplayer/join?data={"MultiplayerJoin":{"Address":"' + focused_server.ip + ':' + focused_server.port + '"}}';
    console.log(url);
    window.open(url, '_blank').focus()
}

async function get_race(ip, port){
    var data;
    // await $.getJSON("/get_race?name=" + name.replaceAll(" ", "-").replaceAll("#", ""), (rec) => {
    //     data = rec;
    // });

    // data = await (await fetch("/get_race?name=" + name.replaceAll(" ", "_").replaceAll("#", "--h--").replaceAll("+", "--p--"))).json();
    data = await (await fetch("/get_race?ip=" + ip + "&port=" + port)).json()
    
    if (data == "closed") {
        close_sidebar();
        return;
    }

    return data
}

async function open_race_sidebar(ip, port){
    var sidebar = document.getElementById("main-sidebar");
    sidebar.style.right = "calc(0px - var(--sidebar-width) - 25px)";
    

    var loading_sidebar = document.getElementById("loading-sidebar");
    loading_sidebar.style.right = 0;

    sidebar_opened = true;

    // var data;

    // data = await (await fetch("/get_race?name=" + name.replaceAll(" ", "_").replaceAll("#", "--h--"))).json();

    // if (!sidebar_opened) {
    //     return data;
    // }

    var tmp_focused_server = await get_race(ip, port)
    
    if (tmp_focused_server == undefined){
        return;
    }
    
    focused_server = tmp_focused_server;

    document.getElementById("race-list").style.width = "calc(100vw - var(--sidebar-width) + 25px)"

    if (!sidebar_opened) {
        return focused_server
    }

    open_race(focused_server, false);

    setTimeout(
        () => {
            loading_sidebar.style.right = "-40%";
        }
    , slide_time);

    return focused_server;
}

async function loadFilters(){
    var region = localStorage.getItem('region');
    var level = localStorage.getItem('level');
    var sort_by = localStorage.getItem('sortby');
    var reverse = localStorage.getItem('reverse') == "true";

    var auto_refresh_local_s = localStorage.getItem("auto-refresh") == "true";

    // if (auto_refresh_local_s != null) {
    //     auto_refresh = auto_refresh_local_s;
    //     document.getElementById("auto-refresh").checked = auto_refresh;
    //     started_at = Date.now();
    // }
    // else {
    //     localStorage.setItem("auto-refresh", auto_refresh);
    // }

    

    if (region == null || level == null || sort_by == null || reverse == null){
        return applyFilters(true, true);
    }

    document.getElementById("reverse-order-checkbox").checked = reverse;

    var select = document.getElementById("regions-dropdown");
    select.value = region;

    var select = document.getElementById("levels-dropdown");
    select.value = level;

    var select = document.getElementById("sort-by-dropdown");
    select.value = sort_by;

    await create_race_list(region, level, sort_by + (reverse ? "-1" : ""), true, true);
}


async function applyFilters(reload_data=false, reorder=false){
    var reverse = document.getElementById("reverse-order-checkbox").checked;

    var select = document.getElementById("regions-dropdown");
    var region = select.options[select.selectedIndex].value;

    var select = document.getElementById("levels-dropdown");
    var level = select.options[select.selectedIndex].value;

    var select = document.getElementById("sort-by-dropdown");
    var sort_by = select.options[select.selectedIndex].value;

    localStorage.setItem('region', region);
    localStorage.setItem('level', level);
    localStorage.setItem('sortby', sort_by);
    localStorage.setItem('reverse', reverse);

    await create_race_list(region, level, sort_by + (reverse ? "-1" : ""), reload_data, reorder);
}


async function create_race_list(region="all", level="all", sort_by="", reload_data=false, reorder=false){
    /*
    region: show only races form this region (options: all, europe, america, oceania).
    level : show only races of this level (options: all, rookie, am, pro).
    sort_by:
        time      - sort by most time left.
        time-1    - sort by least time left.
        players   - sort by most players in server.
        players-1 - sort by least players in server;
        session   - sort by session (order is: practice, qualify, race).
        session-1 - sort by session (order is: race, quialify, practice). 
    */

    
    var container;
    // await $.getJSON("/get_race_list", (rec) => {
    //     race_list = rec;
    // });
    container = document.getElementById("race-list");
    
    if (container == undefined) {
        document.addEventListener('DOMContentLoaded', (event) => {
            container = document.getElementById("race-list");
        })
    }
    
    if (reload_data || race_list == undefined) {
        race_list = await (await fetch("/get_race_list")).json();
        last_update_time = Date.now();
    }
    

    var sessions = ["practice", "qualify", "race"];



    var filtered_race_list = race_list.slice();

    if (sort_by.toLowerCase().includes("time")) {
        filtered_race_list.sort(function(a, b){
            return (b.time_left - a.time_left) * (sort_by[sort_by.length-1] == "1" ? -1 : 1);
        });
    }
    else if (sort_by.toLowerCase().includes("players-1")) {
        filtered_race_list.sort(function(a, b){
            return (a.player_ids.length - b.player_ids.length);
        });
    }
    else if (sort_by.toLowerCase().includes("session")) {
        filtered_race_list.sort(function(a, b){
            return (sessions.indexOf(b.session.toLowerCase()) - sessions.indexOf(a.session.toLowerCase())) * (sort_by[sort_by.length-1] == "1" ? 1 : -1);
        });
    }

    filtered_race_list = filtered_race_list.filter(server => {
        return (region == "all" || server.name.toLowerCase().includes(region.toLowerCase())) && (level == "all" || server.level.toLowerCase().includes(level.toLowerCase()))
    });


    var current_races = document.getElementsByClassName("race-container");

    if (current_races.length == 0 || reorder) {
        initial_time_lefts = [];
        time_lefts = [];
        sorted_races = [];

        var new_inner = race_list.map(
            (server, index) => {

                var classes_thumbnails = '';
                server.classes_thumbnails.forEach(
                    (thumb) => {
                        classes_thumbnails += `<img src="${thumb}" alt="class_thumbnail" class="class-img logo-row-item"></img>`;
                    }
                )


                var level_shortened;
                if (server.level == "Amateur"){
                    level_shortened = 'am';
                }
                else{
                    level_shortened = server.level;
                }


                var level_img = `<img class="level-img" src="${statics_url + 'images/' + level_shortened.toLowerCase() + '.png'}" alt="level"></img>`;
                
                initial_time_lefts.push(server.time_left);
                time_lefts.push(server.time_left);
                sorted_races.push(server.name);

                var race_html = `<div class="race-container" onclick='open_race_sidebar("${server.ip}", ${server.port});'>
                                    
                                    <div class="track-car">
                                        <img src="${server.track_thumbnail}" alt="track_thumbnail" class="track-img"></img>
                                        <div style="display: flex; position: absolute; top: 0px; left:10px; height: 48%; width: calc(100% - 20px); align-items: center;">
                                            <img src="${server.track_logo}" alt="track_logo" class="track-logo logo-row-item"></img>
                                            <img src="${server.track_map}" alt="track_map" class="track-logo logo-row-item"></img>
                                        </div>
                                        <div style="display: flex; position: absolute; bottom: 0px; left: 5px; height: 48%; width: calc(100% - 10px); align-items: center;">
                                            ${classes_thumbnails}
                                        </div>
                                    </div>

                                    <div style="display: flex;" class="race-data">
                                        <!-- <img src="${server.thumbnail}" alt="server_thumbnail" class="thumbnail"></img> -->

                                        <div style="margin-left: 20px; position: relative;" class="server-details">

                                            <div class="name-level">
                                                <h2 style="margin-right: 4px !important;">${server.name}</h2>
                                                    ${level_img}
                                            </div>

                                            <div style="display: inline-flex; position: relative; margin-top: 20px; margin-left: 0px; margin-bottom: 10px; justify-content: space-between; align-items: center; width: calc(100% - 20px);">

                                                <div class="driver-count">
                                                    <img class="car-icon" src="${statics_url + 'images/car-front-1.png'}" alt="car_front_1"></img>
                                                    <p>${server.player_ids.length}</p>
                                                </div>
                                                
                                                <div class="session">
                                                    <img class="clock-icon" src="${statics_url + 'images/clock.png'}" alt="clock"></img>
                                                    <p>${server.session}</p>
                                                </div>

                                                <div class="countdown" style="display: flex;">
                                                    <p id="minutes-${index}"></p>
                                                    <p id="seconds-${index}"></p>
                                                </div>
                                            </div>

                                    </div>


                                    </div>

                                </div>`
                
                // container.innerHTML += race_html;
                return race_html;
            }
        );
        
        container.innerHTML = '';
        container.insertAdjacentHTML('afterbegin', new_inner.join('\n'));

        current_races = document.getElementsByClassName("race-container");
    }


    for (let server of current_races){
        var server_name = server.getElementsByClassName("name-level")[0].getElementsByTagName("h2")[0].innerHTML;
        var found = false
        for (let i=0; i<filtered_race_list.length; i++){
            if (filtered_race_list[i].name == server_name){
                server.className = "race-container";
                found = true;
                break;
            }
        }
        if (!found) {
            server.className = "race-container invisible";
        }
    }
}



// create_race_list();

document.addEventListener('DOMContentLoaded', (event) => {
    loadFilters();
})






// AWS pinging


var regions = {
    'us-east-1': 'US-East (Virginia)',
    'us-east-2': 'US East (Ohio)',
    'us-west-1': 'US-West (California)',
    'us-west-2': 'US-West (Oregon)', // America
    'ca-central-1': 'Canada (Central)',
    'eu-west-1': 'Europe (Ireland)',
    'eu-west-2': 'Europe (London)',
    'eu-central-1': 'Europe (Frankfurt)', // Europe
    'ap-south-1': 'Asia Pacific (Mumbai)',
    'ap-southeast-1': 'Asia Pacific (Singapore)',
    'ap-southeast-2': 'Asia Pacific (Sydney)', // Oceania
    'ap-northeast-1': 'Asia Pacific (Tokyo)',
    'ap-northeast-2': 'Asia Pacific (Seoul)',
    'sa-east-1': 'South America (São Paulo)',
    'cn-north-1': 'China (Beijing)',
};

var raceroomRegions = {
    'eu': 'eu-central-1',
    'oc': 'ap-southeast-2',
    'am': 'us-west-2'
}

var specialUrls = {
    'cn-north-1': 'http://dynamodb.cn-north-1.amazonaws.com.cn/'
};


function testUrl(region) {
    return (region in specialUrls ?
             specialUrls[region] : 'http://dynamodb.' + region + '.amazonaws.com/') + 
           'does-not-exist?cache-break=' +
              Math.floor(Math.random() * Math.pow(2, 52)).toString(36);
}

function callbackOnError(url, cb) {
    var img = new Image;
    img.onerror = cb;
    img.src = url;
}

function timestamp() {
    return (new Date()).getTime();
}

function pingRegion(region, cb) {
    var url = testUrl(region);
    // First failed request to prime connection
    callbackOnError(url, function() {
        // Second for measuring duration
        var start = timestamp();
        callbackOnError(url, function() {
            cb(timestamp() - start);
        });
    });
}




function open_race(server, redirect=true, change_tab=true){
    if (redirect){
        location.href = "?ip=" + server.ip + "&port=" + server.port;
    }
    else {
        // console.log(server);

        var sidebar = document.getElementById("main-sidebar");

        if (change_tab) {
            moveToFirst();
        }
        
        sidebar.style.right = 0;
        
        document.getElementById("sidebar-track-name").innerHTML = server.track.Name;
        document.getElementById("sidebar-track-layout").innerHTML = server.track_layout.Name;
        document.getElementById("sidebar-track-logo").innerHTML = '<img src="' + server.track_logo + '" alt="track_logo" class="sidebar-track-logo"></img>\n';
        document.getElementById("sidebar-track-map").innerHTML = '<img src="' + server.track_map + '" alt="track_map" class="sidebar-track-map"></img>\n';

        document.getElementById("sidebar-driver-count").innerHTML = server.player_ids.length;
        document.getElementById("sidebar-sof").innerHTML = Math.round(server.sof * 1000) / 1000;
        document.getElementById("sidebar-rep").innerHTML = Math.round(server.rep * 1000) / 1000;

        document.getElementById("sidebar-session").innerHTML = server.session;

        document.getElementById("sidebar-ping").innerHTML = "loading...";
        var reg;
        if (server.name.includes("Europe")) {
            reg = "eu";
        }
        else if (server.name.includes("Oceania")) {
            reg = "oc";
        }
        else if (server.name.conincludestains("America")) {
            reg = "am";
        }
        pingRegion(raceroomRegions[reg], (time) => {document.getElementById("sidebar-ping").innerHTML = time + "ms";});
        

        document.getElementById("sidebar-p-dur").innerHTML = server.p_duration;
        document.getElementById("sidebar-q-dur").innerHTML = server.q_duration;

        document.getElementById("sidebar-tirewear").innerHTML = server.tire_wear;
        document.getElementById("sidebar-fuelusage").innerHTML = server.fuel_usage;
        document.getElementById("sidebar-mandatorypit").innerHTML = server.mandatory_pit_stop;
        document.getElementById("sidebar-cutrules").innerHTML = server.cut_rules;


        var durations_div = document.getElementById("sidebar-duration-details");
        if (durations_div.innerHTML.includes('"sidebar-r0-dur-text"')){
            durations_div.innerHTML = durations_div.innerHTML.substring(0, durations_div.innerHTML.indexOf('<div id="sidebar-r0-dur-text"'));
        }

        for (let i=0; i<server.r_duration.length; i++){
            durations_div.insertAdjacentHTML('beforeend', '<div id="sidebar-r' + i + '-dur-text" class="two-line-data" style="flex: 1;">' + 
            '<h3 class="sidebar-header" style="text-align: center !important;">R</h3> ' + 
            '<h3 id="sidebar-r' + i + '-dur" style="text-align: center !important;">' + server.r_duration[i] + '</h3></div>');
        }

        var countdown = document.getElementById("sidebar-countdown")
        countdown.dataset.raceIndex = sorted_races.indexOf(server.name);

        var classes_div = document.getElementById("sidebar-classes");

        classes_div.innerHTML = "";

        for(let i=0; i<server.classes_thumbnails.length; i++){
            classes_div.innerHTML += '<img src="' + server.classes_thumbnails[i] + '" alt="class_thumbnail" class="class-img"></img>\n';
        }



        var driver_container = document.getElementById("driver-info");
        driver_container.innerHTML = "";

        server.players.sort(function(a, b){return b.Rating - a.Rating;})
        
        for (let i=0; i<server.players.length; i++){
            var driver = server.players[i];
            var driver_element = `<div class="sidebar-section sidebar-driver-details" onclick="window.open('https://game.raceroom.com/users/${driver.UserId}/career', '_blank').focus();">
                                    <div class="driver-line">
                                        <div class="driver-icon" style="flex: 1;">
                                            <img src="https://game.raceroom.com/game/user_avatar/${driver.UserId}" alt="drvier_icon" class="driver-icon" height="120vh" style="margin-right: 8px;">
                                        </div>

                                        <div id="sidebar-track-text" style="flex: 1; padding-left: 30px !important;">
                                            <h2 class="driver-name" style="margin-bottom: 10px;">${driver.Fullname}</h2>
                                            <h3 id="sidebar-track-layout" style="margin-top: 10px; text-align: left;">${driver.Team == "" ? "Privateer" : urlify(driver.Team)}</h3>
                                        </div>
                                        
                                        <div class="driver-icon" style="flex: 1; justify-content: right;">
                                            <img src="https://static1.beta.game.raceroom.com/static/img/flags/${driver.Country.toLowerCase()}.svg" alt="${driver.Country.toLowerCase()}_country_flag" class="driver-country" height="60vh" style="aspect-ratio: 7 / 6; margin-right: 20px;">
                                        </div>
                                    </div>


                                    <div class="driver-line" style="text-align: center; margin-top: 10px; margin-left: 50px;">
                                        <div style="flex: 1;">
                                            <h3>${driver.Rating}</h3>
                                        </div>

                                        <div style="flex: 1;">
                                            <h3>${driver.Reputation}</h3>
                                        </div>

                                        <div style="flex: 1; display: flex; margin-left: 80px;" id="sidebar-races-completed">
                                            <img src="${statics_url + 'images/car-front-2.png'}" alt="car_front_2" width="35px" height="35px;" style="margin-top: 15px; margin-right: 5px;"></img>
                                            <h3>${driver.RacesCompleted}</h3>
                                        </div>
                                    </div>
                                </div>`

            driver_container.innerHTML += driver_element;
            
        }
    }
}

function close_sidebar(){
    sidebar_opened = false;
    var sidebar = document.getElementById("main-sidebar");
    sidebar.style.right = "calc(0px - var(--sidebar-width) - 25px)";
    sidebar = document.getElementById("loading-sidebar");
    sidebar.style.right = "calc(0px - var(--sidebar-width) - 25px)";

    document.getElementById("race-list").style.width = "100vw"

    var current_inner = document.getElementById("sidebar-duration-details").innerHTML;
    setTimeout(
        () => {
            var durations_div = document.getElementById("sidebar-duration-details")
            if (durations_div.innerHTML.includes('"sidebar-r0-dur-text"')){
                durations_div.innerHTML = current_inner.substring(0, current_inner.indexOf('<div id="sidebar-r0-dur-text"'));
            }
        }
    , slide_time);
    
}


function moveToFirst() {
    document.getElementById("slide").className = "move-to-first";
    document.getElementById("tab2").className = "tab";
    document.getElementById("tab1").className = "tab selected";
}

function moveToSecond() {
    document.getElementById("slide").className = "move-to-second";
    document.getElementById("tab1").className = "tab";
    document.getElementById("tab2").className = "tab selected";
}




function autoRefreshEnableDisable(){
    auto_refresh = document.getElementById("auto-refresh").checked;
    localStorage.setItem("auto-refresh", auto_refresh);
    started_at = Date.now();
    refresh_activated_at = Date.now();
}



