var time_lefts = []
var sorted_races = []
var focused_server;
var sidebar_opened = false;
var statics_url;

var slide_time;
var auto_refresh = false;

document.addEventListener('DOMContentLoaded', function () {
    // should read #FF0000 or rgb(255, 0, 0)
    // slide_time = $('#main-sidebar').css('transition-duration');
    slide_time = document.getElementById("main-sidebar").style.transitionDuration;
    slide_time = parseFloat(slide_time.substring(0, slide_time.indexOf('s'))) * 1000 + 100;
}, false);




var time_since_last_refresh = 0;
var auto_refresh_every = 60;

function update_times(){
    var countdown = document.getElementById("sidebar-countdown");
    var auto_refresh_countdown = document.getElementById("auto-refresh-countdown");

    setInterval(async function() {
        

        if (auto_refresh){
            auto_refresh_countdown.innerHTML = (auto_refresh_every - time_since_last_refresh) + "s";
            
            if (time_since_last_refresh == auto_refresh_every){
                time_since_last_refresh = 0;
                await applyFilters(show_loading=false);
            }
            time_since_last_refresh += 1;
        }
        else {
            auto_refresh_countdown.innerHTML = "";
            time_since_last_refresh = 0;
        }

        

        for (let i = 0; i < time_lefts.length; i++){
            if (time_lefts[i] < 0){
                time_lefts[i] = 0;
            }
            
            let minutes = Math.floor(time_lefts[i] / 60);
            let seconds = time_lefts[i] % 60;

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
            

            time_lefts[i] -= 1;
        }
    
    }, 1000)
}


function joinFocusedServer(){
    var url = 'rrre://multiplayer/join?data={"MultiplayerJoin":{"Address":"' + focused_server.ip + ':' + focused_server.port + '"}}';
    console.log(url);
    window.open(url, '_blank').focus()
}

async function get_race(name){
    var sidebar = document.getElementById("main-sidebar");
    sidebar.style.right = "calc(0px - var(--sidebar-width) - 25px)";

    var loading_sidebar = document.getElementById("loading-sidebar");
    loading_sidebar.style.right = 0;

    sidebar_opened = true;

    var data;
    // await $.getJSON("/get_race?name=" + name.replaceAll(" ", "-").replaceAll("#", ""), (rec) => {
    //     data = rec;
    // });
    data = await (await fetch("/get_race?name=" + name.replaceAll(" ", "-").replaceAll("#", ""))).json();

    if (!sidebar_opened) {
        return data;
    }

    focused_server = data;

    open_race(data, false);

    setTimeout(
        () => {
            loading_sidebar.style.right = "-40%";
        }
    , slide_time);

    return data;
}


async function applyFilters(show_loading=true){
    var reverse = document.getElementById("reverse-order-checkbox").checked;

    var select = document.getElementById("regions-dropdown");
    var region = select.options[select.selectedIndex].value;

    var select = document.getElementById("levels-dropdown");
    var level = select.options[select.selectedIndex].value;

    var select = document.getElementById("sort-by-dropdown");
    var sort_by = select.options[select.selectedIndex].value + (reverse ? "-1" : "");

    await create_race_list(region, level, sort_by, show_loading);
}

// async function getJSON(url, callback) {
//     var xhr = new XMLHttpRequest();
//     xhr.open('GET', url, true);
//     xhr.responseType = 'json';
//     xhr.onload = function() {
//       var status = xhr.status;
//       if (status === 200) {
//         callback(null, xhr.response);
//       } else {
//         callback(status, xhr.response);
//       }
//     };
//     await xhr.send();
// };

async function create_race_list(region="all", level="all", sort_by="", show_loading=true){
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

    var race_list;
    var container;
    // await $.getJSON("/get_race_list", (rec) => {
    //     race_list = rec;
    // });
    container = document.getElementById("race-list");
    try{
        if (show_loading) {
            container.innerHTML = '<h1 style="text-align: center !important; margin-top: 20%;">Loading...</h1>';
        }
    }
    catch {
        window.onload = function() {
            container = document.getElementById("race-list");
            if (show_loading) {
                container.innerHTML = '<h1 style="text-align: center !important; margin-top: 20%;">Loading...</h1>';
            }
        }
    }
    

    race_list = await (await fetch("/get_race_list")).json();
    
    container.innerHTML = '';

    time_lefts = [];
    sorted_races = [];

    var sessions = ["practice", "qualify", "race"];


    var race_htmls = [];

    if (sort_by.toLowerCase().includes("time")) {
        race_list.sort(function(a, b){
            return (b.time_left - a.time_left) * (sort_by[sort_by.length-1] == "1" ? -1 : 1);
        });
    }
    else if (sort_by.toLowerCase().includes("players-1")) {
        race_list.sort(function(a, b){
            return (a.player_ids.length - b.player_ids.length);
        });
    }
    else if (sort_by.toLowerCase().includes("session")) {
        race_list.sort(function(a, b){
            return (sessions.indexOf(b.session.toLowerCase()) - sessions.indexOf(a.session.toLowerCase())) * (sort_by[sort_by.length-1] == "1" ? 1 : -1);
        });
    }

    race_list = race_list.filter(server => {
        return (region == "all" || server.name.toLowerCase().includes(region.toLowerCase())) && (level == "all" || server.level.toLowerCase().includes(level.toLowerCase()))
    });


    race_list.forEach(
        (server, index) => {

            var classes_thumbnails = '';
            server.classes_thumbnails.forEach(
                (thumb, classes_index) => {
                    classes_thumbnails += `<img src="${thumb}" alt="class_thumbnail" class="class-img logo-row-item"></img>`;
                }
            )
            // if (server.classes_thumbnails.length > 4){
            //     server.classes_thumbnails.forEach(
            //         (thumb, classes_index) => {
            //             classes_thumbnails += `<img src="${thumb}" class="class-img"
            //             style="left: calc((calc(27% / (${server.classes_thumbnails.length} - 4)) + var(--class-img-margin)) * ${classes_index} + var(--class-img-margin)); width: calc(27% / (${server.classes_thumbnails.length} - 4)); height: auto;"></img>`;
            //         }
            //     )
            // }
            // else {
            //     server.classes_thumbnails.forEach(
            //         (thumb, classes_index) => {
            //             classes_thumbnails += `<img src="${thumb}" class="class-img" style="left: calc((var(--class-img-height) + var(--class-img-margin)) * ${classes_index} + var(--class-img-margin));"></img>`
            //         }
            //     )
            // }


            var level_shortened;
            if (server.level == "Amateur"){
                level_shortened = 'am';
            }
            else{
                level_shortened = server.level;
            }


            var level_img = `<img class="level-img" src="${statics_url + 'images/' + level_shortened.toLowerCase() + '.png'}" alt="level"></img>`;

            time_lefts.push(server.time_left);
            sorted_races.push(server.name);

            var race_html = `<div class="race-container" onclick='get_race("${server.name}");'>
                                
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
                                            <h2>${server.name}</h2>
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
            
            race_htmls.push(race_html);
            container.innerHTML += race_html;
            
        }
    );


    // if (sort_by == "" || sort_by == "players") {
    //     already sorted
    // }


}



create_race_list();

function open_race(server, redirect=true){
    if (redirect){
        location.href = "?name=" + server.name.replaceAll(" ", "-").replaceAll("#", "");
    }
    else {
        console.log(server);

        var sidebar = document.getElementById("main-sidebar");
        moveToFirst();
        sidebar.style.right = 0;
        document.getElementById("sidebar-track-name").innerHTML = server.track.Name;
        document.getElementById("sidebar-track-layout").innerHTML = server.track_layout.Name;
        document.getElementById("sidebar-track-logo").innerHTML = '<img src="' + server.track_logo + '" alt="track_logo" class="sidebar-track-logo"></img>\n';
        document.getElementById("sidebar-track-map").innerHTML = '<img src="' + server.track_map + '" alt="track_map" class="sidebar-track-map"></img>\n';

        document.getElementById("sidebar-driver-count").innerHTML = server.player_ids.length;
        document.getElementById("sidebar-sof").innerHTML = Math.round(server.sof * 1000) / 1000;
        document.getElementById("sidebar-rep").innerHTML = Math.round(server.rep * 1000) / 1000;

        document.getElementById("sidebar-session").innerHTML = server.session;

        document.getElementById("sidebar-p-dur").innerHTML = server.p_duration;
        document.getElementById("sidebar-q-dur").innerHTML = server.q_duration;

        document.getElementById("sidebar-tirewear").innerHTML = server.tire_wear;
        document.getElementById("sidebar-fuelusage").innerHTML = server.fuel_usage;
        document.getElementById("sidebar-mandatorypit").innerHTML = server.mandatory_pit_stop;
        document.getElementById("sidebar-cutrules").innerHTML = server.cut_rules;


        var durations_div = document.getElementById("sidebar-duration-details");

        for (let i=0; i<server.r_duration.length; i++){
            durations_div.innerHTML += '<div id="sidebar-r' + i + '-dur-text" class="two-line-data" style="flex: 1;">' + 
            '<h3 class="sidebar-header" style="text-align: center !important;">R</h3> ' + 
            '<h3 id="sidebar-r' + i + '-dur" style="text-align: center !important;">' + server.r_duration[i] + '</h3></div>'
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
                                            <img src="http://game.raceroom.com/game/user_avatar/${driver.UserId}" alt="drvier_icon" class="driver-icon" height="120vh" style="margin-right: 8px;">
                                        </div>

                                        <div id="sidebar-track-text" style="flex: 1; padding-left: 30px !important;">
                                            <h2 class="driver-name" style="margin-bottom: 10px;">${driver.Fullname}</h2>
                                            <h3 id="sidebar-track-layout" style="margin-top: 10px; text-align: left;">${driver.Team == "" ? "Privateer" : driver.Team}</h3>
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

    var current_inner = document.getElementById("sidebar-duration-details").innerHTML;
    setTimeout(
        () => {
            document.getElementById("sidebar-duration-details").innerHTML = current_inner.substring(0, current_inner.indexOf('<div id="sidebar-r0-dur-text"'));
        }
    , slide_time);
    
}


// $(function () {
//     $("#tab1").click(moveToFirst);
//     $("#tab2").click(moveToSecond);
// });


// function moveToFirst() {
//     $("#slide").attr('class', 'move-to-first');
//     $(".tab").attr('class', 'tab');
//     $("#tab1").attr('class', 'tab selected');
// }

// function moveToSecond() {
//     $("#slide").attr('class', 'move-to-second');
//     $(".tab").attr('class', 'tab');
//     $("#tab2").attr('class', 'tab selected');
// }

function moveToFirst() {
    console.log("first");
    document.getElementById("slide").className = "move-to-first";
    document.getElementById("tab2").className = "tab";
    document.getElementById("tab1").className = "tab selected";
}

function moveToSecond() {
    console.log("second");
    document.getElementById("slide").className = "move-to-second";
    document.getElementById("tab1").className = "tab";
    document.getElementById("tab2").className = "tab selected";
}




function autoRefreshEnableDisable(){
    auto_refresh = document.getElementById("auto-refresh").checked;
    time_since_last_refresh = 0;
}