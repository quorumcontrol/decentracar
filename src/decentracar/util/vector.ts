export class Vector {
    x:number
    y:number
    constructor(x:number,y:number) {
        this.x = x;
        this.y = y;
    }

  set(x:number, y:number)
	{
		this.x = x;
		this.y = y;

        return this;
        
    }
    
  add(v:Vector)
	{
		this.x += v.x;
		this.y += v.y;

		return this;
    }
    
  sub(v:Vector)
	{
		this.x -= v.x;
		this.y -= v.y;

		return this;
    }
    
  mul(s:number)
	{
		this.x *= s;
		this.y *= s;

		return this;
    }
    
  div(s:number)
	{
		!s && console.log("Division by zero!");

		this.x /= s;
		this.y /= s;

		return this;
    }
    
  mag(){
		return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
  normalize()
	{
		var mag = this.mag();
		mag && this.div(mag);
		return this;
    }
    
  angle()
	{
		return Math.atan2(this.y, this.x);
    }
    
  setMag(m:number)
	{
		var angle = this.angle();
		this.x = m * Math.cos(angle);
		this.y = m * Math.sin(angle);
		return this;
    }
    
  setAngle(a:number)
	{
		var mag = this.mag();
		this.x = mag * Math.cos(a);
		this.y = mag * Math.sin(a);
		return this;
    }
    
  rotate(a:number)
	{
		this.setAngle(this.angle() + a);
		return this;
    }
    
  limit(l:number)
	{
		var mag = this.mag();
		if(mag > l)
			this.setMag(l);
		return this;
    }
    
  angleBetween(v:Vector)
	{
		return this.angle() - v.angle();
    }
    
  dot(v:Vector)
	{
		return this.x * v.x + this.y * v.y;
    }
    
  lerp(v:Vector, amt:number)
	{
		this.x += (v.x - this.x) * amt;
		this.y += (v.y - this.y) * amt;
		return this;
    }
    
  dist(v:Vector)
	{
		var dx = this.x - v.x;
		var dy = this.y - v.y;
		return Math.sqrt(dx * dx + dy * dy);
    }
    
  copy()
	{
		return new Vector(this.x, this.y);
	}
}


export default Vector