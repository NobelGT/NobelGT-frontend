var ws = null;

var schedules = [];
var scheduleBeginTime = moment("6:30 AM", "hh:mm A").year(1970).month(1).day(1);

$( "form" ).submit(function(event) {
    event.preventDefault();

    if (ws == null) {
        updateAlert(false, "Connecting...");

        $(".tablecol table").empty();
        schedules = [];

        ws = new WebSocket("ws://localhost:9000/");

        ws.onopen = receiveConnection;
        ws.onclose = receiveClosure;
        ws.onmessage = receiveMessage;

    }
});

function handleScheduleClick(event) {
    var $target = $(this);

    var thisId = parseInt($target.attr('data-id'));
    var selectedId = $(".tablecol tr.selected").attr('data-id');
    if (thisId != selectedId) {
        $(".tablecol tr.selected").removeClass("selected");

        $target.addClass("selected");

        displaySelection(thisId);
    }
}

function receiveConnection() {
    sendData({
        listCourses: $("#listCourses").val(),
        freeDays: $("#freeDays").val(),
        startTime: $("#startTime").val(),
        endTime: $("#endTime").val()
    });
}

function sendData(data) {
    var msg = {
        COMMAND: "REQUEST",
        PARAMETERS: data
    };

    ws.send(JSON.stringify(msg));
    updateAlert(false, "Sending...");
}

function receiveMessage(event) {
    var message = event.data;
    //if (typeof message === String) {
        var msg = $.parseJSON(message);

        switch (msg.COMMAND) {
            case "PROGRESS":
                receiveData(msg.PARAMETERS);
                break;
            case "ERROR":
                receiveError(msg.PARAMETERS);
                break;
            case "COMPLETION":
                receiveCompletion();
                break;
            default:
                console.log("BOOM!")
        }
    //}
}

function receiveData(data) {
    var progress = data.progress;
    var score = data.score;

    var key = schedules.push(data) - 1;

    var $table = $(".tablecol > table");
    var $addedRow = $(sprintf("<tr data-id=\"%d\"><td><h3>Schedule</h3><p>%.2f</p></td></tr>", key, score));
    $addedRow.appendTo($table);
    $addedRow.click(handleScheduleClick);
    var $tableRows = $table.find("tr");
    [].sort.call($tableRows, sortEntries);
    $tableRows.each(function(){
        $table.append(this);
    });

    updateAlert(false, sprintf("Loading: %d%%", progress));
}

function receiveError(error) {
    updateAlert(true, error.MESSAGE);
}

function receiveCompletion() {
    $("#cover").hide();
}

function receiveClosure() {
    ws = null;
}

function displaySelection(selection) {
    $('.scheduleitem').remove();

    schedule = schedules[selection];
    courses = schedule.courses;

    var plt = palette('tol-rainbow', courses.length);
    shuffle(plt);

    for (var i = 0; i < courses.length; i++) {
        course = courses[i];
        code = course.code;
        name = course.name;
        color = plt[i];

        sessions = course.sessions;
        for (var j = 0; j < sessions.length; j++) {
            session = sessions[j];
            start = session.startTime;
            end = session.endTime;

            day = session.day;

            // Server days start with Monday. We want ours to start Sunday.
            day = (day + 1) % 7;

            $popover = $(sprintf("<div><p><strong>Location:</strong> %s</p><p><strong>Instructors:</strong>" +
                " %s</p><p><strong>Type:</strong> %s</p></div>", session.location, session.instructors, session.type));

            addScheduleItem(day, start, end, code, name, color, $popover.html());
        }
    }
}

function addScheduleItem(day, start, end, title, name, color, popoverContents) {
    var startTime = moment(start, "hh:mm A").year(1970).month(1).day(1);
    var endTime = moment(end, "hh:mm A").year(1970).month(1).day(1);

    var startSlots = Math.round(startTime.diff(scheduleBeginTime, 'minutes') / 30.0);
    var slotHeight = Math.round(endTime.diff(startTime, 'minutes') / 30.0);

    var top = sprintf("%.3f%%", startSlots * 3.225);
    var height = sprintf("%.3f%%", slotHeight * 3.225);
    var left = sprintf("%.3f%%", day * 14.285);

    var $item = $(sprintf('<div class="scheduleitem" style="top: %s; left:%s; height: %s;' +
        ' background-color:#%s;" data-placement="auto" data-toggle="popover" data-viewport=".schedulecol"' +
        ' data-trigger="hover" data-html="true" title="%s" data-content="%s">%s</div>', top,
        left, height, color, title + ": " + name, popoverContents, title));
    $item.appendTo($(".schedulecol"));
    $item.popover();
}

function updateAlert(isError, text) {
    $("#alerttext").text(text);

    if (isError) {
        $("#alertIcon").text("error_outline");
        $("#alertBox").removeClass("alert-info");
        $("#alertBox").addClass("alert-danger");

        $("#cancelButton").show();
    } else {
        $("#alertIcon").text("info_outline");
        $("#alertBox").removeClass("alert-danger");
        $("#alertBox").addClass("alert-info");

        $("#cancelButton").hide();
    }

    $("#cover").show();
}

$("#cancelButton").click(function() {
    $("#cover").hide();
});

function sortEntries(a, b) {
    var an = schedules[parseInt($(a).attr('data-id'))].score,
        bn = schedules[parseInt($(b).attr('data-id'))].score;

    if(an < bn) {
        return 1;
    }
    if(an > bn) {
        return -1;
    }
    return 0;
}

function shuffle(array) {
    let counter = array.length;

    // While there are elements in the array
    while (counter > 0) {
        // Pick a random index
        let index = Math.floor(Math.random() * counter);

        // Decrease counter by 1
        counter--;

        // And swap the last element with it
        let temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }

    return array;
}