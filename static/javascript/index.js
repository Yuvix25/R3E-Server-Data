var time_lefts = []
var sorted_races = []
var focused_server;

var slide_time;
// var auto_refresh = false;

document.addEventListener('DOMContentLoaded', function () {
    // should read #FF0000 or rgb(255, 0, 0)
    slide_time = $('#main-sidebar').css('transition-duration');
    slide_time = parseFloat(slide_time.substring(0, slide_time.indexOf('s'))) * 1000 + 100;
}, false);




// var time_since_last_refresh = 0;
// var auto_refresh_every = 5;

function update_times(){
    var countdown = document.getElementById("sidebar-countdown");
    // var auto_refresh_countdown = document.getElementById("auto-refresh-countdown");

    setInterval(function() {
        

        // if (auto_refresh){
        //     auto_refresh_countdown.innerHTML = (auto_refresh_every - time_since_last_refresh) + "s";
            
        //     if (time_since_last_refresh == auto_refresh_every){
        //         time_since_last_refresh = 0;
        //         location.reload();
        //     }
        //     time_since_last_refresh += 1;
        // }
        // else {
        //     auto_refresh_countdown.innerHTML = "";
        //     time_since_last_refresh = 0;
        // }

        

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

            document.getElementById("minutes-"+i).innerHTML = minutes + ":";
            document.getElementById("seconds-"+i).innerHTML = seconds;

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

    var data;
    await $.getJSON("/get_race?name=" + name.replaceAll(" ", "-").replaceAll("#", ""), (rec) => {
        data = rec;
    });

    focused_server = data;

    open_race(data, false);

    setTimeout(
        () => {
            loading_sidebar.style.right = "-40%";
        }
    , slide_time);

    return data;
}

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
        document.getElementById("sidebar-track-logo").innerHTML = '<img src="' + server.track_logo + '" class="sidebar-track-logo"></img>\n';
        document.getElementById("sidebar-track-map").innerHTML = '<img src="' + server.track_map + '" class="sidebar-track-map"></img>\n';

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
            classes_div.innerHTML += '<img src="' + server.classes_thumbnails[i] + '" class="class-img"></img>\n';
        }



        var driver_container = document.getElementById("driver-info");
        driver_container.innerHTML = "";

        server.players.sort(function(a, b){return b.Rating - a.Rating;})
        
        for (let i=0; i<server.players.length; i++){
            var driver = server.players[i];
            var driver_element = `<div class="sidebar-section sidebar-driver-details" onclick="window.open('https://game.raceroom.com/users/${driver.UserId}', '_blank').focus();">
                                    <div class="driver-line">
                                        <div class="driver-icon" style="flex: 1;">
                                            <img src="http://game.raceroom.com/game/user_avatar/${driver.UserId}" class="driver-icon" height="120vh" style="margin-right: 8px;">
                                        </div>

                                        <div id="sidebar-track-text" style="flex: 1; padding-left: 30px !important;">
                                            <h2 class="driver-name" style="margin-bottom: 10px;">${driver.Fullname}</h2>
                                            <h3 id="sidebar-track-layout" style="margin-top: 10px; text-align: left;">${driver.Team == "" ? "Privateer" : driver.Team}</h3>
                                        </div>
                                        
                                        <div class="driver-icon" style="flex: 1; justify-content: right;">
                                            <img src="https://static1.beta.game.raceroom.com/static/img/flags/${driver.Country.toLowerCase()}.svg" class="driver-country" height="60vh" style="aspect-ratio: 7 / 6; margin-right: 20px;">
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
                                            <img src="/static/images/car-front-2.png" width="35px" height="35px;" style="margin-top: 15px; margin-right: 5px;"></img>
                                            <h3>${driver.RacesCompleted}</h3>
                                        </div>
                                    </div>
                                </div>`

            driver_container.innerHTML += driver_element;
            
        }
    }
}

function close_sidebar(){
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


$(function () {
    $("#tab1").click(moveToFirst);
    $("#tab2").click(moveToSecond);
});


function moveToFirst() {
    $("#slide").attr('class', 'move-to-first');
    $(".tab").attr('class', 'tab');
    $("#tab1").attr('class', 'tab selected');
}

function moveToSecond() {
    $("#slide").attr('class', 'move-to-second');
    $(".tab").attr('class', 'tab');
    $("#tab2").attr('class', 'tab selected');
}






// function autoRefreshEnableDisable(){
//     value = document.getElementById("auto-refresh").checked;
//     auto_refresh = value;
// }