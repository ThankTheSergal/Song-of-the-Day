const request = require('request');
const rpc = require('discord-rpc');
const yts = require('youtube-search');
const dotenv = require('dotenv').config();
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

async function getPlaylistSongs(limit, offset, access_token){
    return new Promise((resolve, reject) => {
        let authenticatedRequest = {
            url: 'https://api.spotify.com/v1/playlists/1EBgi3cwA0Oa3XV0VjJfVy/tracks',
            headers: {
                'Authorization': 'Bearer ' + access_token
            },
            json: true
        }
        authenticatedRequest.url = (limit) ? `https://api.spotify.com/v1/playlists/1EBgi3cwA0Oa3XV0VjJfVy/tracks?limit=${limit}&offset=${offset}`: `https://api.spotify.com/v1/playlists/1EBgi3cwA0Oa3XV0VjJfVy/tracks?limit=${5}`;
        
        request.get(authenticatedRequest, (err, res) => {
            if(err){ reject(err) };
            if(limit == 1){
                if(!res.body.items) return;
                return resolve(res.body.items[0].track);
            }else{
                return resolve(res.body.total);
            }
        });
    })
}

async function searchYoutube(song){
    return new Promise((resolve, reject) => {
        let opts = {
            maxResults: 10,
            key: process.env.YT_API_KEY
        }
        yts(`${song.name} - ${song.artists[0].name}`, opts, function(err, results){
            if(err) return console.error(err);
            let link = null;
            for(let i = 0; i < 10; i++){
                if(results[i].channelTitle.match(song.artists[0].name) && results[i].link.match(`/watch?`)){
                    link = results[i].link;
                }
            }
            if(link){
                resolve(link);
                return;
            }
            if(results[0].link){
                resolve(results[0].link);
                return;
            }
            reject(new Error("No video found."));
        })
    })
}

async function getAccessToken() {
    return new Promise((resolve, reject) => {
        let authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
            },
            body: 'grant_type=client_credentials',
            json: true
        };
        
        request.post(authOptions, async (err, res, body) => {
            if(!err && res.statusCode == 200){
                let access_token = body.access_token;
                if(!access_token) reject( new Error("Could not get access token"));
                resolve(access_token);
            }
        });
    })
}

let songName = 'Evil';
let artistName = 'Heavenly';
let songLink = 'https://youtu.be/snCNnlTcutg?si=JcwpIPcEptwHWR5s';

async function getYoutubeLink(token){
    let total = await getPlaylistSongs(10, 0, token);
    let randomSongNumber = Math.floor(Math.random() * total);
    let song = await getPlaylistSongs(1, randomSongNumber, token);
    songName = `${song.name}`;
    artistName = `${song.artists[0].name}`;
    let link = await searchYoutube(song);
    if(link.match('https://www.youtube.com/watch?')){
        songLink = link;
    }
}

async function main(){
    try{
        let accessToken = await getAccessToken();
        if(!accessToken) return;
        await getYoutubeLink(accessToken);
        return true;
    }catch(e){
        console.log(e);
        return false;
    }
}

main();

let activity;

function setActivityDetails() {
    let songString;
    if(songName.length + artistName.length + 3 <= 32){
        songString = `${artistName} - ${songName}`;
    }else{
        if(songName.length > 32){
            songName = songName.slice(0,29);
            songName += '...';
        }
        songString = songName;
    }
    let imageArray = [
        'https://c.tenor.com/afqg5H7O4eQAAAAd/tenor.gif',
        'https://i.imgur.com/DbJcOpz.png',
        'https://i.imgur.com/qaS5UuA.png',
        'https://i.imgur.com/Es81M1x.gif',
        'https://i.imgur.com/GzWy7U1.gif',
        'https://i.imgur.com/OmbR1yk.gif',
        'https://i.imgur.com/qtYora7.gif',
        'https://i.imgur.com/mHhG3xB.png',
    ]
    let randomImageNumber = Math.floor(Math.random() * imageArray.length);
    let randomImage = imageArray[randomImageNumber];

    activity = {
        clientid: '630978618125844485',
        details: 'Fetches a random song from my',
        state: 'spotify playlist. Made by myself.',
        largeImageKey: randomImage,
        buttons: [
            { label: `${songString}`, url: `${songLink}` },
            { label: 'Hot Gay Horny Dragons', url: 'https://hot-gay-horny-dragons.ca/' }
        ]
    };
}

setActivityDetails();

let clientId = '630978618125844485';
rpc.register(clientId);
const client = new rpc.Client({transport: 'ipc'});

setTimeout(() => { client.setActivity(activity) }, 5000)      // Intital wait for login.

setInterval(async () => {                  // loop for selecting a song per day
    let success = await main();
    if(success){
        setActivityDetails();
        client.setActivity(activity);
    }
}, 60e3 * 60 * 24);   

client.login({ clientId }).catch(console.error);