import Vector from './vector'

// lon/Lat (not lat,long) maps to x,y
export const mapCenter = new Vector(13.362029, 52.491362)

// see https://stackoverflow.com/questions/31192451/generate-random-geo-coordinates-within-specific-radius-from-seed-point
export function randomGeo(center:Vector, radius:number):Vector {
    var y0 = center.y;
    var x0 = center.x;
    var rd = radius / 111300;

    var u = Math.random();
    var v = Math.random();

    var w = rd * Math.sqrt(u);
    var t = 2 * Math.PI * v;
    var x = w * Math.cos(t);
    var y = w * Math.sin(t);

    return new Vector(x+x0, y+y0)
}

// see https://stackoverflow.com/questions/31192451/generate-random-geo-coordinates-within-specific-radius-from-seed-point
export function distance(lat1:number, lon1:number, lat2:number, lon2:number) {
    var R = 6371000;
    var a = 0.5 - Math.cos((lat2 - lat1) * Math.PI / 180) / 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * (1 - Math.cos((lon2 - lon1) * Math.PI / 180)) / 2;
    return R * 2 * Math.asin(Math.sqrt(a));
}
