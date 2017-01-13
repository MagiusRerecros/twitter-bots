//Log in the console that the bot process has begun
console.log('Starting TWCE Bot.');

//Set up dependencies
var Twit = require('twit');
var config = require('./config');
var jsonfile = require('jsonfile');

//Set up global variables
var index = 0;
var hashtags;
var data;
var event;
var firstTemplate;
var thanksTemplate;
var standardTemplate;
var lastTemplate;
var T = new Twit(config);
var hashtagPath = './hashtags.json';
var dataPath = './data.json'

//List current time both locally and in UTC
console.log('Current local DateTime: ' + getDateTime() + '.');
console.log('Current UTC DateTime: ' + getDateTimeUTC() + '.');

setInterval(timerPulse, 1000 * 60);

jsonfile.readFile(hashtagPath, handleHashtags);

timerPulse();

//Executes every minute via setInterval; starts process of potentially sending tweets
function timerPulse() {
    data = jsonfile.readFileSync(dataPath);
    configureData();

    if (checkTime(index)) {
        console.log('Tweet scheduled for ' + getDateTimeUTC() + ' UTC. Posting tweet.');
        if (index === 0) {
            //First tweet logic
            var tweet = processFirstTemplate();
            postTweet(tweet);
            console.log('Tweeted:' + tweet);
            index = index + 1;
        }
        else if (index < (data.list.length - 1)) {
            //Thank previous broadcaster
            var thanks = processThanksTemplate(index - 1);
            postTweet(thanks);
            console.log('Tweeted: ' + thanks);

            //Tweet next broadcaster
            var tweet = processStandardTemplate(index);
            postTweet(tweet);
            console.log('Tweeted: ' + tweet);

            index = index + 1;
        }
        else {
            //Thank previous broadcaster
            var thanks = processThanksTemplate(index - 1);
            postTweet(thanks);
            console.log('Tweeted: ' + thanks);

            //Tweet final event broadcaster
            var tweet = processLastTemplate();
            postTweet(tweet);
            console.log('Tweeted: ' + tweet);

            //Exit bot
            console.log('Last tweet posted. Exiting bot.');
            process.exit(0);
        }
    }
    else {
        console.log('No tweet scheduled for ' + getDateTimeUTC() + ' UTC. Next tweet at ' + data.list[index].time + ' UTC.');
    }
}

//Stores data from hashtags.json into global variable
function handleHashtags(err, obj) {
    if (err) throw err;

    hashtags = obj;
    console.log('Hashtags loaded: ');
    console.log(hashtags.list);

    configureStream();
}

//Compares current time in UTC to the time in the tweet list stored in the "data" variable
function checkTime(i) {
    var tweetInfo = data.list[i];
    if (tweetInfo) {
        if (tweetInfo.time < getDateTimeUTC()) { //Current time is after next scheduled tweet; skip tweet and check next tweet
            index = index + 1;
            return checkTime(index);
        }
        else if (tweetInfo.time === getDateTimeUTC()) { //Current time matches next scheduled tweet; return true
            return true;
        }
        else { //Current time is before next scheduled tweet; return false
            return false;
        }
    }
    else {
        console.log('No more tweets. Exiting bot.');
        process.exit(0);
    }
}

//Replaces tempate text with details from tweet list
function processFirstTemplate() {
    var tweetInfo = data.list[0];
    var tweet = firstTemplate.replace('Event', event).replace('@TwitterUsername', tweetInfo.twitterUser).replace('TwitchUsername', tweetInfo.twitchUser);
    return tweet;
}

//Replaces tempate text with details from tweet list
function processThanksTemplate(i) {
    var tweetInfo = data.list[i];
    var tweet = thanksTemplate.replace('Event', event).replace('@TwitterUsername', tweetInfo.twitterUser).replace('TwitchUsername', tweetInfo.twitchUser);
    return tweet;
}

//Replaces tempate text with details from tweet list
function processStandardTemplate(i) {
    var tweetInfo = data.list[i];
    var tweet = standardTemplate.replace('Event', event).replace('@TwitterUsername', tweetInfo.twitterUser).replace('TwitchUsername', tweetInfo.twitchUser);
    return tweet;
}

//Replaces tempate text with details from tweet list
function processLastTemplate() {
    var tweetInfo = data.list[data.list.length - 1];
    var tweet = lastTemplate.replace('Event', event).replace('@TwitterUsername', tweetInfo.twitterUser).replace('TwitchUsername', tweetInfo.twitchUser);
    return tweet;
}

//Returns current local datetime in form YYYY-MM-DD HH:MM
function getDateTime() {
    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? '0' : '') + hour;

    var min = date.getMinutes();
    min = (min < 10 ? '0' : '') + min;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? '0' : '') + month;

    var day = date.getDate();
    day = (day < 10 ? '0' : '') + day;

    return year + '-' + month + '-' + day + ' ' + hour + ':' + min;
}

//Returns current UTC datetime in form YYYY-MM-DD HH:MM
function getDateTimeUTC() {
    var date = new Date();

    var hour = date.getUTCHours();
    hour = (hour < 10 ? '0' : '') + hour;

    var min = date.getUTCMinutes();
    min = (min < 10 ? '0' : '') + min;

    var year = date.getUTCFullYear();

    var month = date.getUTCMonth() + 1;
    month = (month < 10 ? '0' : '') + month;

    var day = date.getUTCDate();
    day = (day < 10 ? '0' : '') + day;

    return year + '-' + month + '-' + day + ' ' + hour + ':' + min;
}

//Create and initialize a Twit stream to monitor new tweets for tweets to retweet based on their hashtags
function configureStream() {
    console.log('Starting stream to monitor for hashtags to retweet.');
    var stream = T.stream('statuses/filter', { track: hashtags.list });
    stream.on('tweet', tweetEvent);
}

//Initialize global variables for cleaner code
function configureData() {
    event = data.event;
    firstTemplate = data.firstTemplate;
    thanksTemplate = data.thanksTemplate;
    standardTemplate = data.standardTemplate;
    lastTemplate = data.lastTemplate;
}

//Executes when tweet with specific hashtag is detected by stream
function tweetEvent(tweet) {
    var tweeter = tweet.user.screen_name;
    var tweetId = tweet.id_str;

    console.log('Tweet detected. @' + tweet.user.screen_name + ': ' + tweet.text);

    if (tweeter === 'MewgiBot') {
        console.log('Detected own tweet, ignoring.');
        return;
    }
    else {
        //console.log('Simulated retweet');
        T.post('statuses/retweet/:id', { id: tweetId }, function (err, data, response) {
            if (err) {
                console.error('Twit retweet error: ' + err);
                return;
            }

            console.log(data.text);
        });
    }
}

//Posts a string to Twitter
function postTweet(tweetData) {
    var tweet = {
        status: tweetData
    };

    T.post('statuses/update', tweet, function (err, data, response) {
        if (err) {
            console.error('Twit tweet error: ', err);
        }
    });
}