const sessions = ["practice", "qualify", "race"];
const levels = ["rookie", "amateur", "pro", "elite", "gold"];


var initial_time_lefts = [];
var time_lefts = [];
var last_update_time = Date.now();

var sorted_races = [];
var server_ips = [];
var fetched_servers = new Map();
var focused_server;
var current_server;
var sidebar_opened = false;
var statics_url;

var slide_time;
var auto_refresh = false;

var race_list;



var refresh_activated_at = Date.now();
var started_at = Date.now();
var auto_refresh_every = 60; // seconds
var disable_after = 60; // minutes


function htmlDecode(input) {
    var doc = new DOMParser().parseFromString(input, "text/html");
    return doc.documentElement.textContent;
}

const twitch_regex = /(twitch\.tv\/[a-zA-Z0-9_]+)/ig;
const urlRegex = /(http(s)?:\/\/)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9]{1,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)?/ig;


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}



function pushState(data, unused, url) {
    if (location.href != url) {
        history.pushState(data, unused, url);
    }
}

function getParam(key) {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(key);
}

function clearQueryString() {
    var url = window.location.href;
    var url_parts = url.split("?");
    if (url_parts.length > 1) {
        url = url_parts[0];
    }
    pushState({change:'main'}, '', url);
}

function updateQueryStringParameter(uri, key, value) {
    var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
    var separator = uri.indexOf('?') !== -1 ? "&" : "?";
    if (uri.match(re)) {
        return uri.replace(re, '$1' + key + "=" + value + '$2');
    }
    else {
        return uri + separator + key + "=" + value;
    }
}

function queryExists(key) {
    var url = window.location.href;
    if(url.indexOf('?' + key + '=') != -1)
        return true;
    else if(url.indexOf('&' + key + '=') != -1)
        return true;
    return false
}








/**
 * Convert absolute CSS numerical values to pixels.
 *
 * @link https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Values_and_units#numbers_lengths_and_percentages
 *
 * @param {string} cssValue
 * @param {null|HTMLElement} target Used for relative units.
 * @return {*}
 */
 window.convertCssUnit = function( cssValue, target ) {

    target = target || document.body;

    const supportedUnits = {

        // Absolute sizes
        'px': value => value,
        'cm': value => value * 38,
        'mm': value => value * 3.8,
        'q': value => value * 0.95,
        'in': value => value * 96,
        'pc': value => value * 16,
        'pt': value => value * 1.333333,

        // Relative sizes
        'rem': value => value * parseFloat( getComputedStyle( document.documentElement ).fontSize ),
        'em': value => value * parseFloat( getComputedStyle( target ).fontSize ),
        'vw': value => value / 100 * window.innerWidth,
        'vh': value => value / 100 * window.innerHeight,

        // Times
        'ms': value => value,
        's': value => value * 1000,

        // Angles
        'deg': value => value,
        'rad': value => value * ( 180 / Math.PI ),
        'grad': value => value * ( 180 / 200 ),
        'turn': value => value * 360

    };

    // Match positive and negative numbers including decimals with following unit
    const pattern = new RegExp( `^([\-\+]?(?:\\d+(?:\\.\\d+)?))(${ Object.keys( supportedUnits ).join( '|' ) })$`, 'i' );

    // If is a match, return example: [ "-2.75rem", "-2.75", "rem" ]
    const matches = String.prototype.toString.apply( cssValue ).trim().match( pattern );

    if ( matches ) {
        const value = Number( matches[ 1 ] );
        const unit = matches[ 2 ].toLocaleLowerCase();

        // Sanity check, make sure unit conversion function exists
        if ( unit in supportedUnits ) {
            return supportedUnits[ unit ]( value );
        }
    }

    return cssValue;

};



function openTeamUrl(ev, url){
    window.open(url, '_blank').focus();
    ev.stopPropagation();
}

function openSidebarTab(ev, ip, port, server=undefined, tab=0) {
    ev.stopPropagation();
    open_race_sidebar(ip, port, server, tab);
}

function twitch_hover(element_string, url=undefined) {
    if (twitch_regex.test(url) || url==undefined){

        if (url==undefined){
            url = "<URL>";
        }

        contains_twitch = true;
        var channel;
        var tmp_url = url.slice();

        tmp_url.replace(twitch_regex, function(twitch_url) {
            channel = twitch_url.replace("twitch.tv/", "");
        });

        var element = document.createElement('div');
        element.innerHTML = element_string;
        element = element.firstChild;

        element.classList.add("twitch-hover");
        element.innerHTML += `<div class="twitch-embed-container" onclick="openTeamUrl(event, \'` + url + `\');"><div class="twitch-embed">
                                <iframe
                                    style="margin-top: 15px; box-shadow: 3px 3px 30px #000000; border: 0px;"
                                    src="https://player.twitch.tv/?channel=${channel}&parent=r3e-server-data.herokuapp.com&muted=true"
                                    width="100%"
                                    height="100%"
                                    allowfullscreen="true">
                                </iframe></div>
                            </div>`
        
        return element.outerHTML;
    }
}

function twitch_icon_hover(element_string, url=undefined) {
    if (twitch_regex.test(url) || url==undefined){
        contains_twitch = true;
        var channel;
        

        if (url != undefined){
            var tmp_url = url.slice();

            tmp_url.replace(twitch_regex, function(twitch_url) {
                channel = twitch_url.replace("twitch.tv/", "");
            });
        }
        else {
            channel = "<URL>"
        }

        var element = document.createElement('div');
        element.innerHTML = element_string;
        element = element.firstChild;
        var id = element.id;
        element.id = "";

        element.classList.add("twitch-expand-disappear");
        element.classList.remove("no-twitch");
        return `
        <div class="twitch-hover-expand no-twitch" id="${id}">
            ${element.outerHTML}
            <div class="twitch-expand-appear">
                <iframe
                    style="box-shadow: 3px 3px 30px #000000; border: 0px;"
                    src="https://player.twitch.tv/?channel=${channel}&parent=r3e-server-data.herokuapp.com&muted=true"
                    width="100%"
                    height="100%"
                    allowfullscreen="false">
                </iframe>
            </div>
        </div>`
    }
}

function urlify(text) {
    var found_channel = false;
    text = text.replace(urlRegex, function(url) {
        url_text = url;
        if (!url.startsWith("http")){
            url = "https://" + url;
        }
        var new_element;
        if (twitch_regex.test(url)){
            contains_twitch = true;
            var channel;
            var tmp_url = url.slice();
            tmp_url.replace(twitch_regex, function(twitch_url) {
                channel = twitch_url.replace("twitch.tv/", "");
                found_channel = channel;
            });
            
            new_element = `<a class="twitch-link" id="twitch-link-${channel}" href="${url}" target="_blank" onclick="event.stopPropagation();">` + url_text + '</a>';
            new_element = twitch_hover(new_element, url);
        }
        else {
            new_element = `<a class="link" href="${url}" target="_blank" onclick="event.stopPropagation();">` + url_text + '</a>';
        }
        return new_element;
    });

    return [found_channel, text];
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
    
    }, 100)
}


function joinFocusedServer(){
    var url = 'rrre://multiplayer/join?data={"MultiplayerJoin":{"Address":"' + focused_server.ip + ':' + focused_server.port + '"}}';
    window.open(url, '_blank').focus()
}


async function get_race(ip, port, force_update=false, do_backend_update=false, update_current_server=true){
    var data;
    // await $.getJSON("/get_race?name=" + name.replaceAll(" ", "-").replaceAll("#", ""), (rec) => {
    //     data = rec;
    // });

    // data = await (await fetch("/get_race?name=" + name.replaceAll(" ", "_").replaceAll("#", "--h--").replaceAll("+", "--p--"))).json();
    var url = "/get_race?ip=" + ip + "&port=" + port;

    if (update_current_server) {
        current_server = [ip, port];
    }

    if (fetched_servers.has(url) && (!force_update)) {
        data = fetched_servers.get(url);
        get_race(ip, port, true, do_backend_update);
    }
    else {
        data = await (await fetch(url + (do_backend_update ? "&update=1" : ""))).json();
        fetched_servers.set(url, data);
    }
    
    if (data == "closed") {
        close_sidebar();
        return;
    }

    if (current_server != undefined && current_server[0] != ip && current_server[1] != port){
        return;
    }

    if (force_update) {
        setTimeout(() => {
            open_race_sidebar(ip, port, data, -1, false); 
        }, 300);
    }

    if (do_backend_update && (!fetched_servers.has(url) || force_update)) {
        await applyFilters(true, true, false);
    }

    for (const race of fetched_servers.values()){
        var found_twitch = false;
        for (const driver of race.players){
            var urlified = urlify(driver.Team)
            var twitch_icon = document.getElementById("twitch-" + race.ip + "-" + race.port);
            if (twitch_icon != undefined) {
                if (urlified[0] != false && !found_twitch) {
                    if (twitch_icon.classList.contains("no-twitch")) {
                        twitch_icon.classList.remove("no-twitch");
                    }
                    twitch_icon.innerHTML = twitch_icon.innerHTML.replace("<URL>", urlified[0]);
                    found_twitch = true;
                }
                else if (urlified[0] == false && !twitch_icon.classList.contains("no-twitch") && !found_twitch) {
                    twitch_icon.classList.add("no-twitch");
                }
            }
        }
    }
    

    return data
}

async function open_race_sidebar(ip, port, server=undefined, tab=-1, push_state=true, do_backend_update=false){
    if (server == undefined){
        sidebar_opened = true;
    }

    if (push_state) {
        var new_url = updateQueryStringParameter(window.location.href, 'ip', ip);
        new_url = updateQueryStringParameter(new_url, 'port', port);
        if (tab != -1){
            new_url = updateQueryStringParameter(new_url, 'tab', tab);
        }
        
        pushState({change:'open'}, '', new_url);
    }


    var sidebar = document.getElementById("main-sidebar");
    
    var loading_sidebar = document.getElementById("loading-sidebar");
    if (server == undefined) {
        sidebar.style.right = "calc(0px - var(--sidebar-width) - 25px)";
        loading_sidebar.style.right = 0;
    }

    

    // var data;

    // data = await (await fetch("/get_race?name=" + name.replaceAll(" ", "_").replaceAll("#", "--h--"))).json();

    // if (!sidebar_opened) {
    //     return data;
    // }

    if (server == undefined) {
        var tmp_focused_server = await get_race(ip, port, false, do_backend_update);
    }
    else {
        var tmp_focused_server = server;
    }
    
    if (tmp_focused_server == undefined){
        return;
    }
    
    focused_server = tmp_focused_server;

    document.getElementById("race-list").style.width = "calc(100vw - var(--sidebar-width) + 25px)";

    if (!sidebar_opened) {
        close_sidebar(false);
        return focused_server;
    }

    open_race(focused_server, false, (tab==-1 ? false : true), tab);

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
        return applyFilters(true, true, false);
    }

    document.getElementById("reverse-order-checkbox").checked = reverse;

    var select = document.getElementById("regions-dropdown");
    select.value = region;

    var select = document.getElementById("levels-dropdown");
    select.value = level;

    var select = document.getElementById("sort-by-dropdown");
    select.value = sort_by;

    return await create_race_list(region, level, sort_by + (reverse ? "-1" : ""), true, true);
}


async function applyFilters(reload_data=false, reorder=false, update_backend=true){
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

    await create_race_list(region, level, sort_by + (reverse ? "-1" : ""), reload_data, reorder, update_backend);
}


async function create_race_list(region="all", level="all", sort_by="", reload_data=false, reorder=false, update_backend=true){
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
        level     - sort by level (order is: rookie, am, pro, elite, gold).
        level-1   - sort by level (order is: gold, elite, pro, am, rookie).
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
        race_list = await (await fetch("/get_race_list" + (update_backend ? "" : "?dontupdate"))).json();
        last_update_time = Date.now();
    }

    if (typeof race_list[0] === 'string' || race_list[0] instanceof String){
        document.getElementById('main-message').style.fontSize = '1.6em';
        document.getElementById('main-message').innerHTML = race_list[0];

        document.getElementById('race-list').style.minHeight = '0px';
        return null;
    }

    var sorted_race_list = race_list.slice();

    if (sort_by.toLowerCase().includes("time")) {
        sorted_race_list.sort(function(a, b){
            return (b.time_left - a.time_left) * (sort_by[sort_by.length-1] == "1" ? -1 : 1);
        });
    }
    else if (sort_by.toLowerCase().includes("players-1")) {
        sorted_race_list.sort(function(a, b){
            return (a.player_ids.length - b.player_ids.length);
        });
    }
    else if (sort_by.toLowerCase().includes("session")) {
        sorted_race_list.sort(function(a, b){
            return (sessions.indexOf(b.session.toLowerCase()) - sessions.indexOf(a.session.toLowerCase())) *
            (sort_by[sort_by.length-1] == "1" ? 1 : -1);
        });
    }
    else if (sort_by.toLowerCase().includes("level")) {
        sorted_race_list.sort(function(a, b){
            return (levels.indexOf(b.level.toLowerCase()) - levels.indexOf(a.level.toLowerCase())) *
            (sort_by[sort_by.length-1] == "1" ? -1 : 1);
        });
    }


    var current_races = document.getElementsByClassName("race-container");

    if (current_races.length == 0 || reorder) {
        initial_time_lefts = [];
        time_lefts = [];
        sorted_races = [];
        server_ips = [];
        
        var track_car_width = getComputedStyle(document.body).getPropertyValue('--race-container-width');
        track_car_width = window.convertCssUnit(track_car_width) - window.convertCssUnit("12px");

        var track_car_height = getComputedStyle(document.body).getPropertyValue('--track-car-height');
        track_car_height = window.convertCssUnit(track_car_height);

        var new_inner = sorted_race_list.map(
            (server, index) => {

                var base = "0";
                var growth = "0";
                if (server.classes_thumbnails.length > 4) {
                    base = 100 / server.classes_thumbnails.length * 1.3 + "%";
                }
                else {
                    growth = "calc(0.48 * var(--track-car-height) / (var(--race-container-width) - 12px))";
                }
                var classes_thumbnails = '';
                server.classes_thumbnails.forEach(
                    (thumb) => {
                        classes_thumbnails += `<img src="${thumb}" alt="class_thumbnail" class="class-img logo-row-item" style="flex: ${growth} 1 ${base} !important;"></img>`;
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
                server_ips.push([server.ip, server.port]);

                var twitch_element = `<img src="${statics_url + 'images/twitch-icon.png'}" alt="twitch_logo" onclick='openSidebarTab(event, "${server.ip}", ${server.port}, undefined, 1);' class="twitch-logo no-twitch" id="twitch-${server.ip}-${server.port}" title="Race might be live-streamed, click to watch! (hover on twitch link)"></img>`;
                // twitch_element = twitch_icon_hover(twitch_element);

                var race_html = `<div class="race-container" onclick='open_race_sidebar("${server.ip}", ${server.port}, undefined, -1, true, true);'>
                                    
                                    <div class="track-car">
                                        <img src="${server.track_thumbnail}" alt="track_thumbnail" class="track-img"></img>
                                        <div style="display: flex; position: absolute; top: 0px; left:10px; height: 48%; width: calc(100% - 20px); align-items: center;">
                                            <img src="${server.track_logo}" alt="track_logo" class="track-logo logo-row-item"></img>
                                            <img src="${server.track_map}" alt="track_map" class="track-logo logo-row-item"></img>
                                        </div>
                                        ${twitch_element}
                                        <div class="car-classes">
                                            ${classes_thumbnails}
                                        </div>
                                    </div>

                                    <div style="display: flex;" class="race-data">
                                        <!-- <img src="${server.thumbnail}" alt="server_thumbnail" class="thumbnail"></img> -->

                                        <div style="margin-left: 20px; position: relative;" class="server-details">

                                            <div class="name-level">
                                                <h2 style="margin-right: 10px !important;">${server.name}</h2>
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

    var filtered_race_list = sorted_race_list.filter(server => {
        return (region == "all" || server.name.toLowerCase().includes(region.toLowerCase()) || server.name.toLowerCase().includes(specialNamedRegions[region.toLowerCase()])) && (level == "all" || server.level.toLowerCase().includes(level.toLowerCase()) || (level == "elite" && server.level.toLowerCase().includes("gold")))
    });
    for (let server of current_races){
        var server_name = htmlDecode(server.getElementsByClassName("name-level")[0].getElementsByTagName("h2")[0].innerHTML);
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
    return true;
}


// create_race_list();

function openSidebarFromQuery(push_state=true) {
    if (queryExists('ip') && queryExists('port')) {
        if (queryExists('tab')) {
            open_race_sidebar(getParam('ip'), getParam('port'), undefined, parseInt(getParam('tab')), push_state);
        }
        else {
            open_race_sidebar(getParam('ip'), getParam('port'), undefined, 1, push_state);
        }
    }
}

window.onpopstate = function(event) {
    var state;
    if (history.state == null) {
        if (queryExists('ip') && queryExists('port')) {
            state = {change:'open'};
        }
        else {
            state = {change:'main'};
        }
    }
    else {
        state = history.state;
    }
    
    if (state.change == 'tab') { 
        if (getParam('tab') == '1') { 
            moveToFirst(false);
        }
        else if (getParam('tab') == '2') { 
            moveToSecond(false);
        }
    }
    else if (state.change == 'main') {
        close_sidebar(false);
    }
    else if (state.change == 'open') {
        openSidebarFromQuery(false);
    }
    else {
        location.reload();
    }
};


document.addEventListener('DOMContentLoaded', async (event) => {
    var res = await loadFilters();
    if (res != null) {
        openSidebarFromQuery(false);

        for (const server of server_ips) {
            get_race(server[0], server[1], false, false, false);
        }
    }
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
    'sa-east-1': 'South America (S??o Paulo)',
    'cn-north-1': 'China (Beijing)',
};

var raceroomRegions = {
    'eu': 'eu-central-1',
    'oc': 'ap-southeast-2',
    'am': 'us-west-2'
}

var specialNamedRegions = {
    'europe' : 'eu',
    'america' : 'america',
    'oceania' : 'oceania',
}

var specialUrls = {
    'cn-north-1': 'http://dynamodb.cn-north-1.amazonaws.com.cn/'
};


function testUrl(region) {
    return (region in specialUrls ?
             specialUrls[region] : 'https://dynamodb.' + region + '.amazonaws.com/');
            //  + 
            // 'does-not-exist?cache-break=' +
            //  Math.floor(Math.random() * Math.pow(2, 52)).toString(36);
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

        start = timestamp();
        callbackOnError(url, function() {
            cb(timestamp() - start);
        });
    });
}

async function refreshPing(server, show_loading=true) {
    if (show_loading) {
        document.getElementById("sidebar-ping").innerHTML = "loading...";
    }

    var tmp_name = server.name.toLowerCase()
    var reg;
    if (tmp_name.includes("europe") || tmp_name.includes(specialNamedRegions["europe"])) {
        reg = "eu";
    }
    else if (tmp_name.includes("oceania") || tmp_name.includes(specialNamedRegions["oceania"])) {
        reg = "oc";
    }
    else if (tmp_name.includes("america") || tmp_name.includes(specialNamedRegions["america"])) {
        reg = "am";
    }

    var ms = await (await fetch('/tcping?port=60001&host=' + server.ip)).json();
    if (ms != -1) {
        await sleep(500);
        ms = await (await fetch('/tcping?port=60001&host=' + server.ip)).json();
    }
    
    if (ms == -1) {
        pingRegion(raceroomRegions[reg], (time) => {document.getElementById("sidebar-ping").innerHTML = time + "ms";});
    }
    else {
        document.getElementById("sidebar-ping").innerHTML = Math.round(ms) + "ms";
    }
}


function open_race(server, redirect=true, change_tab=true, to=0){
    if (redirect){
        location.href = "?ip=" + server.ip + "&port=" + server.port;
    }
    else {
        // console.log(server);

        var sidebar = document.getElementById("main-sidebar");

        if (change_tab) {
            if (to == 1) {
                moveToFirst(false);
            }
            else if (to == 2) {
                moveToSecond(false);
            }
        }
        
        sidebar.style.right = 0;
        
        document.getElementById("sidebar-track-name").innerHTML = server.track.Name;
        document.getElementById("sidebar-track-layout").innerHTML = server.track_layout.Name;
        document.getElementById("sidebar-track-logo").innerHTML = '<img src="' + server.track_logo + '" alt="track_logo" class="sidebar-track-logo"></img>\n';
        document.getElementById("sidebar-track-map").innerHTML = '<img src="' + server.track_map + '" alt="track_map" class="sidebar-track-map"></img>\n';

        document.getElementById("sidebar-driver-count").innerHTML = server.player_ids.length;
        document.getElementById("sidebar-sof").innerHTML = Math.round(server.sof * 1000) / 1000;
        document.getElementById("sidebar-rep").innerHTML = Math.round(server.rep * 1000) / 1000;

        document.getElementById("sidebar-min-rep").innerHTML = server.min_rep;
        document.getElementById("sidebar-min-rating").innerHTML = server.min_rating;

        document.getElementById("sidebar-session").innerHTML = server.session;

        refreshPing(focused_server, change_tab);
        

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
            var urlified = urlify(driver.Team);

            var driver_element = `<div class="sidebar-section sidebar-driver-details" onclick="window.open('https://game.raceroom.com/users/${driver.UserId}/career', '_blank').focus();">
                                    <div class="driver-line">
                                        <div class="driver-icon" style="flex: 3;">
                                            <img src="https://game.raceroom.com/game/user_avatar/${driver.UserId}" alt="drvier_icon" class="driver-icon" style="margin-right: 8px; max-height: 60vh; max-width: 70%;">
                                        </div>

                                        <div id="sidebar-driver" style="flex: 4; padding-left: 30px !important; padding-right: 20px !important;">
                                            <h2 class="driver-name" style="margin-bottom: 10px;">${driver.Fullname}</h2>
                                            <div class="sidebar-team">
                                            <h3 style="margin-top: 10px; text-align: left; max-width: calc((var(--sidebar-width) * 0.9 - 30px) * 4 / (3 + 4 + 2)); word-wrap: break-word;">${driver.Team == "" ? "Privateer" : urlified[1]}</h3>
                                            </div>
                                        </div>
                                        
                                        <div class="driver-icon" style="flex: 2; justify-content: right;">
                                            <img src="https://static1.beta.game.raceroom.com/static/img/flags/${driver.Country.toLowerCase()}.svg" alt="${driver.Country.toLowerCase()}_country_flag" class="driver-country" style="aspect-ratio: 7 / 6; margin-right: 20px; max-height: 60vh; max-width: 70%;">
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

function close_sidebar(push_state=true){
    sidebar_opened = false;

    if (push_state){
        clearQueryString();
    }
    
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


function moveToFirst(push_state=true) {
    if ((!queryExists('tab') || getParam('tab') == '2') && push_state) {
        var new_url = updateQueryStringParameter(window.location.href, 'tab', '1');
        pushState({change:'tab'}, '', new_url);
    }

    document.getElementById("slide").className = "move-to-first";
    document.getElementById("tab2").className = "tab";
    document.getElementById("tab1").className = "tab selected";
}

function moveToSecond(push_state=true) {
    if ((!queryExists('tab') || getParam('tab') == '1') && push_state) {
        var new_url = updateQueryStringParameter(window.location.href, 'tab', '2');
        pushState({change:'tab'}, '', new_url);
    }

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



