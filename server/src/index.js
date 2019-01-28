const koa = require('koa');
const app = new koa();
const server = require('http').createServer(app.callback());
const WebSocket = require('ws');
const wss = new WebSocket.Server({server});
const Router = require('koa-router');
const cors = require('koa-cors');
const bodyParser = require('koa-bodyparser');
const convert = require('koa-convert');

app.use(bodyParser());
app.use(convert(cors()));
app.use(async (ctx, next) => {
    const start = new Date();
    await next();
    const ms = new Date() - start;
    console.log(`${ctx.method} ${ctx.url} ${ctx.response.status} - ${ms}ms`);
});

const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
};

const spaceNames = ['Berlin', 'London', 'New York', 'San Francisco', 'Cluj-Napoca'];
const typeNames = ['Small', 'Big', 'Huge', 'Extra Big!'];
const statusTypes = ['available', 'taken'];
const places = [];
for (let i = 0; i < 10; i++) {
    places.push({
        id: i + 1,
        name: spaceNames[getRandomInt(0, spaceNames.length)],
        type: typeNames[getRandomInt(0, typeNames.length)],
        status: statusTypes[getRandomInt(0, statusTypes.length)],
        power: getRandomInt(0, 1000)
    });
}

const router = new Router();
router.get('/places', ctx => {
    ctx.response.body = places.filter(place => place.status === statusTypes[0]);
    ctx.response.status = 200;
});

router.get('/allPlaces', ctx => {
    ctx.response.body = places;
    ctx.response.status = 200;
});

router.post('/take', ctx => {
    // console.log("ctx: " + JSON.stringify(ctx));
    const headers = ctx.request.body;
    // console.log("body: " + JSON.stringify(headers));
    const id = headers.id;
    if (typeof id !== 'undefined') {
        const index = places.findIndex(place => place.id == id);
        if (index === -1) {
            console.log("Place not available!");
            ctx.response.body = {text: 'Place not available!'};
            ctx.response.status = 404;
        } else {
            let place = places[index];
            place.status = statusTypes[1];
            ctx.response.body = place;
            ctx.response.status = 200;
        }
    } else {
        console.log("Missing or invalid: id!");
        ctx.response.body = {text: 'Missing or invalid: id!'};
        ctx.response.status = 404;
    }
});

router.post('/free', ctx => {
    // console.log("ctx: " + JSON.stringify(ctx));
    const headers = ctx.request.body;
    // console.log("body: " + JSON.stringify(headers));
    const id = headers.id;
    if (typeof id !== 'undefined') {
        const index = places.findIndex(place => place.id == id);
        if (index === -1) {
            console.log("Place not available!");
            ctx.response.body = {text: 'Place not available!'};
            ctx.response.status = 404;
        } else {
            let place = places[index];
            place.status = statusTypes[0];
            ctx.response.body = place;
            ctx.response.status = 200;
        }
    } else {
        console.log("Missing or invalid: id!");
        ctx.response.body = {text: 'Missing or invalid: id!'};
        ctx.response.status = 404;
    }
});


const broadcast = (data) =>
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });

router.post('/place', ctx => {
    // console.log("ctx: " + JSON.stringify(ctx));
    const headers = ctx.request.body;
    // console.log("body: " + JSON.stringify(headers));
    const name = headers.name;
    const type = headers.type;
    const power = headers.power;
    if (typeof name !== 'undefined' && typeof type !== 'undefined' && typeof power !== 'undefined') {
        const index = places.findIndex(place => place.name == name);
        if (index !== -1) {
            console.log("Place already exists!");
            ctx.response.body = {text: 'Place already exists!'};
            ctx.response.status = 404;
        } else {
            let maxId = Math.max.apply(Math, places.map(function (place) {
                return place.id;
            })) + 1;
            let place = {
                id: maxId,
                name,
                type,
                power,
                status: statusTypes[0]
            };
            places.push(place);
            broadcast(place);
            ctx.response.body = place;
            ctx.response.status = 200;
        }
    } else {
        console.log("Missing or invalid: name, type or power!");
        ctx.response.body = {text: 'Missing or invalid: name, type or power!'};
        ctx.response.status = 404;
    }
});

router.del('/place/:id', ctx => {
    // console.log("ctx: " + JSON.stringify(ctx));
    const headers = ctx.params;
    // console.log("body: " + JSON.stringify(headers));
    const id = headers.id;
    if (typeof id !== 'undefined') {
        const index = places.findIndex(place => place.id == id);
        if (index === -1) {
            console.log("No place with id: " + id);
            ctx.response.body = {text: 'Invalid place id'};
            ctx.response.status = 404;
        } else {
            let place = places[index];
            places.splice(index, 1);
            ctx.response.body = place;
            ctx.response.status = 200;
        }
    } else {
        ctx.response.body = {text: 'Id missing or invalid'};
        ctx.response.status = 404;
    }
});

app.use(router.routes());
app.use(router.allowedMethods());

server.listen(2029);
