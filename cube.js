/**
 * @author Andrii Pashentsev (https://github.com/andyps)
 * 
 * Simple Rubik's Cube game done during js13kGames competition. Some code were cut to fit into filesize limits.
 * Tested in Firefox, Chrome, Edge, IE 11
 * 
 * Use mouse right/middle mouse buttons to rotate camera.
 * You can also use left mouse button to rotate camera but outside the cube.
 *
 * To zoom camera use mouse wheel.
 *
 * Use left mouse button on cube to rotate its sides. Middle doesn't move!
 * Happy solving!
 */

(function(){
var GlitchCube = function(canvasId) {
    return this.init(canvasId); 
};
// some usefull functions and values
var U = {
    EPS: 0.001,
    PI_HALF: Math.PI / 2,
    PI_180: Math.PI / 180,
    COS80: Math.cos(80 * Math.PI / 180),
    colorFloat2Int: function(fColor) {
        return Math.round(255 * fColor);
    }
};
// just to save some space
var o_t2d = 'TEXTURE_2D';
var o_ab = 'ARRAY_BUFFER';
var o_sd = 'STATIC_DRAW';
var o_eab = 'ELEMENT_ARRAY_BUFFER';

/**
 * Matrix
 * @class
 */
var Matrix;
Matrix = (function () {
    function Matrix() {
        this.elements = new Float32Array(16);
    }
    Matrix.prototype = {
        setFrustum: function(left, right, bottom, top, near, far) {
            var els = this.elements;
            var rw = 1 / (right - left);
            var rh = 1 / (top - bottom);
            var rd = 1 / (far - near);

            els[0] = 2 * near * rw;
            els[1] = 0;
            els[2] = 0;
            els[3] = 0;
            
            els[4] = 0;
            els[5] = 2 * near * rh;
            els[6] = 0;
            els[7] = 0;

            els[8] = (right + left) * rw;
            els[9] = (top + bottom) * rh;
            els[10] = -(far + near) * rd;
            els[11] = -1;
            
            els[12] = 0;
            els[13] = 0;
            els[14] = -2 * near * far * rd;
            els[15] = 0;
            return this;
        },
        setPerspective: function(fovy, aspect, near, far) {
            // fovy is in radians
            var top = near * Math.tan(0.5 * fovy);
            var bottom = -top;
            var right = top * aspect;
            var left = -right;
            
            return this.setFrustum(left, right, bottom, top, near, far);
        },
        setLookAt: function(eyeX, eyeY, eyeZ, centerX, centerY, centerZ, upX, upY, upZ) {
            var els = this.elements;
            var fx = centerX - eyeX;
            var fy = centerY - eyeY;
            var fz = centerZ - eyeZ;
            
            // normalize f
            var rlf = 1 / Math.sqrt(fx * fx + fy * fy + fz * fz);
            fx *= rlf;
            fy *= rlf;
            fz *= rlf;
            
            // cross product of f and up
            var sx = fy * upZ - fz * upY;
            var sy = fz * upX - fx * upZ;
            var sz = fx * upY - fy * upX;
            
            // normalize s
            var rls = 1 / Math.sqrt(sx * sx + sy * sy + sz * sz);
            sx *= rls;
            sy *= rls;
            sz *= rls;
            
            // cross product of s and f
            var ux = sy * fz - sz * fy;
            var uy = sz * fx - sx * fz;
            var uz = sx * fy - sy * fx;
            
            els[0] = sx;
            els[1] = ux;
            els[2] = -fx;
            els[3] = 0;

            els[4] = sy;
            els[5] = uy;
            els[6] = -fy;
            els[7] = 0;

            els[8] = sz;
            els[9] = uz;
            els[10] = -fz;
            els[11] = 0;

            els[12] = 0;
            els[13] = 0;
            els[14] = 0;
            els[15] = 1;
            // translate
            return this.translate(-eyeX, -eyeY, -eyeZ);
        },
        translate: function(x, y, z) {
            var els = this.elements;
            els[12] += els[0] * x + els[4] * y + els[8] * z;
            els[13] += els[1] * x + els[5] * y + els[9] * z;
            els[14] += els[2] * x + els[6] * y + els[10] * z;
            els[15] += els[3] * x + els[7] * y + els[11] * z;
            return this;
        },
        makeTranslate: function(x, y, z) {
            var els = this.elements;
            els[12] = x;
            els[13] = y;
            els[14] = z;
        },
        setIdentity: function() {
            var els = this.elements;
            els[0] = 1; els[4] = 0; els[8] = 0; els[12] = 0;
            els[1] = 0; els[5] = 1; els[9] = 0; els[13] = 0;
            els[2] = 0; els[6] = 0; els[10] = 1; els[14] = 0;
            els[3] = 0; els[7] = 0; els[11] = 0; els[15] = 1;
        },
        setRotateX: function(rad) {
            var els = this.elements;
            var c = Math.cos(rad);
            var s = Math.sin(rad);
            els[0] = 1; els[4] = 0; els[8] = 0; els[12] = 0;
            els[1] = 0; els[5] = c; els[9] = -s; els[13] = 0;
            els[2] = 0; els[6] = s; els[10] = c; els[14] = 0;
            els[3] = 0; els[7] = 0; els[11] = 0; els[15] = 1;
            return this;
        },
        setRotateY: function(rad) {
            var els = this.elements;
            var c = Math.cos(rad);
            var s = Math.sin(rad);
            els[0] = c; els[4] = 0; els[8] = s; els[12] = 0;
            els[1] = 0; els[5] = 1; els[9] = 0; els[13] = 0;
            els[2] = -s; els[6] = 0; els[10] = c; els[14] = 0;
            els[3] = 0; els[7] = 0; els[11] = 0; els[15] = 1;
            return this;
        },
        setRotateZ: function(rad) {
            var els = this.elements;
            var c = Math.cos(rad);
            var s = Math.sin(rad);
            els[0] = c; els[4] = -s; els[8] = 0; els[12] = 0;
            els[1] = s; els[5] = c; els[9] = 0; els[13] = 0;
            els[2] = 0; els[6] = 0; els[10] = 1; els[14] = 0;
            els[3] = 0; els[7] = 0; els[11] = 0; els[15] = 1;
            return this;
        },
        multiplyVector: function(v) {
            var els = this.elements;
            var x = els[0] * v.x + els[4] * v.y + els[8] * v.z + els[12];
            var y = els[1] * v.x + els[5] * v.y + els[9] * v.z + els[13];
            var z = els[2] * v.x + els[6] * v.y + els[10] * v.z + els[14];
            var w = els[3] * v.x + els[7] * v.y + els[11] * v.z + els[15];
            
            x /= w; y /= w; z /= w;
            return new Vector(x, y, z);
        },
        transpose: function() {
            var els = this.elements;
            var tmp;
            tmp = els[1]; els[1] = els[4]; els[4] = tmp;
            tmp = els[2]; els[2] = els[8]; els[8] = tmp;
            tmp = els[3]; els[3] = els[12]; els[12] = tmp;
            tmp = els[6]; els[6] = els[9]; els[9] = tmp;
            tmp = els[7]; els[7] = els[13]; els[13] = tmp;
            tmp = els[11]; els[11] = els[14]; els[14] = tmp;
        },
        setInverseOf: function(m) {
            var els = this.elements;
            var mEls = m.elements;
            
            var n11 = mEls[0], n12 = mEls[4], n13 = mEls[8], n14 = mEls[12];
            var n21 = mEls[1], n22 = mEls[5], n23 = mEls[9], n24 = mEls[13];
            var n31 = mEls[2], n32 = mEls[6], n33 = mEls[10], n34 = mEls[14];
            var n41 = mEls[3], n42 = mEls[7], n43 = mEls[11], n44 = mEls[15];
            
            els[0] = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44;
            els[4] = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44;
            els[8] = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44;
            els[12] = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34;
            els[1] = n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44;
            els[5] = n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44;
            els[9] = n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44;
            els[13] = n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34;
            els[2] = n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44;
            els[6] = n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44;
            els[10] = n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44;
            els[14] = n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34;
            els[3] = n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43;
            els[7] = n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43;
            els[11] = n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43;
            els[15] = n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33;

            var det = n11 * els[0] + n21 * els[4] + n31 * els[8] + n41 * els[12];
            if (det === 0) {
                return;
            }
            det = 1.0 / det;
            for (var i = 0; i < 16; i++) {
                els[i] *= det;
            }
        }
    };
    Matrix.FromValues = function(m11, m12, m13, m14, m21, m22, m23, m24, m31, m32, m33, m34, m41, m42, m43, m44) {
        var result = new Matrix();
        result.elements[0] = m11;
        result.elements[1] = m12;
        result.elements[2] = m13;
        result.elements[3] = m14;
        result.elements[4] = m21;
        result.elements[5] = m22;
        result.elements[6] = m23;
        result.elements[7] = m24;
        result.elements[8] = m31;
        result.elements[9] = m32;
        result.elements[10] = m33;
        result.elements[11] = m34;
        result.elements[12] = m41;
        result.elements[13] = m42;
        result.elements[14] = m43;
        result.elements[15] = m44;
        return result;
    };
    Matrix.Identity = function() {
        return Matrix.FromValues(1.0, 0, 0, 0, 0, 1.0, 0, 0, 0, 0, 1.0, 0, 0, 0, 0, 1.0);
    };
    Matrix.multiplyTo = function(m1, m2, m) {
        var els1 = m1.elements;
        var els2 = m2.elements;
        var els = m.elements;

        els[0] = els1[0] * els2[0] + els1[4] * els2[1] + els1[8] * els2[2] + els1[12] * els2[3];
        els[4] = els1[0] * els2[4] + els1[4] * els2[5] + els1[8] * els2[6] + els1[12] * els2[7];
        els[8] = els1[0] * els2[8] + els1[4] * els2[9] + els1[8] * els2[10] + els1[12] * els2[11];
        els[12] = els1[0] * els2[12] + els1[4] * els2[13] + els1[8] * els2[14] + els1[12] * els2[15];

        els[1] = els1[1] * els2[0] + els1[5] * els2[1] + els1[9] * els2[2] + els1[13] * els2[3];
        els[5] = els1[1] * els2[4] + els1[5] * els2[5] + els1[9] * els2[6] + els1[13] * els2[7];
        els[9] = els1[1] * els2[8] + els1[5] * els2[9] + els1[9] * els2[10] + els1[13] * els2[11];
        els[13] = els1[1] * els2[12] + els1[5] * els2[13] + els1[9] * els2[14] + els1[13] * els2[15];

        els[2] = els1[2] * els2[0] + els1[6] * els2[1] + els1[10] * els2[2] + els1[14] * els2[3];
        els[6] = els1[2] * els2[4] + els1[6] * els2[5] + els1[10] * els2[6] + els1[14] * els2[7];
        els[10] = els1[2] * els2[8] + els1[6] * els2[9] + els1[10] * els2[10] + els1[14] * els2[11];
        els[14] = els1[2] * els2[12] + els1[6] * els2[13] + els1[10] * els2[14] + els1[14] * els2[15];

        els[3] = els1[3] * els2[0] + els1[7] * els2[1] + els1[11] * els2[2] + els1[15] * els2[3];
        els[7] = els1[3] * els2[4] + els1[7] * els2[5] + els1[11] * els2[6] + els1[15] * els2[7];
        els[11] = els1[3] * els2[8] + els1[7] * els2[9] + els1[11] * els2[10] + els1[15] * els2[11];
        els[15] = els1[3] * els2[12] + els1[7] * els2[13] + els1[11] * els2[14] + els1[15] * els2[15];
    };
    return Matrix;
})();
/**
 * Vector
 * @class
 */
var Vector = (function () {
    function Vector(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    Vector.prototype = {
        toArray: function() {
            return [this.x, this.y, this.z];
        },
        lengthSq: function() {
            return this.x * this.x + this.y * this.y + this.z * this.z;
        },
        length: function () {
            return Math.sqrt(this.lengthSq());
        },
        sub: function(v) {
            this.x -= v.x;
            this.y -= v.y;
            this.z -= v.z;
        },
        dot: function(v) {
            return this.x * v.x + this.y * v.y + this.z * v.z;
        },
        normalize: function() {
            var len = this.length();
            this.x /= len;
            this.y /= len;
            this.z /= len;
        },
        clone: function() {
            return new Vector(this.x, this.y, this.z);
        }
    };
    Vector.sub = function(v1, v2) {
        var v = v1.clone();
        v.sub(v2);
        return v;
    };
    return Vector;
})();
/**
 * Camera
 * @class
 */
var Camera = (function () {
    /**
     * @param {number} fovY Field of view in radians
     * @param {number} aspect Aspect ratio
     * @param {number} near Distance to near plane
     * @param {number} far Distance to far plane
     * @param {Vector} position Camera position
     */
    function Camera(fovY, aspect, near, far, position) {
        this.enabled = true;
        this.canvas = null;
        
        this.fovY = fovY;
        this.aspect = aspect;
        this.near = near;
        this.far = far;
        
        this.zoomInertia = 0.9;
        this.rotateInertia = 0.9;
        this.zoomSensibility = 1.0;
        this.zoomOffset = 0;
        
        this.rotateSensibility = 0.01;
        this.rotateOffsetX = 0;
        this.rotateOffsetY = 0;
        this.rotationX = 0; // like latitude but from 0 to 180
        this.rotationY = 0; // like longitude but from 0 to 360
        this.rotateKeySensibility = 10;
        this.keys = [];
        
        this.minDistance = 110;
        this.maxDistance = 210;
        
        this.position = new Vector(position.x, position.y, position.z);
        this.applyPosition();
        
        this.mouse = {x: 0, y: 0, down: false, dx: 0, dy: 0};
        
        this.vMatrix = Matrix.Identity();
        this.pMatrix = Matrix.Identity();
        this.updateMatrices();
    }
    Camera.prototype = {
        /**
         * Check user input and update camera's matrices
         * 
         * @function
         */
        update: function() {
            this.checkKeys();
            
            if (Math.abs(this.zoomOffset) < U.EPS) {
                this.zoomOffset = 0;
            }
            if (Math.abs(this.rotateOffsetX) < U.EPS) {
                this.rotateOffsetX = 0;
            }
            if (Math.abs(this.rotateOffsetY) < U.EPS) {
                this.rotateOffsetY = 0;
            }
            
            if (!this.zoomOffset && !this.rotateOffsetX && !this.rotateOffsetY) {
                return;
            }
            
            if (this.rotateOffsetX || this.rotateOffsetY) {
                // update rotation
                this.rotationX += this.rotateOffsetX;
                this.rotationY += this.rotateOffsetY;
                this.rotateOffsetX *= this.rotateInertia;
                this.rotateOffsetY *= this.rotateInertia;
                
                this.checkRotateLimits();
                this.applyRotation();
            }
            if (this.zoomOffset) {
                // update zoom
                var distance0 = this.distance;
                this.distance += this.zoomOffset;
                this.zoomOffset *= this.zoomInertia;
                
                this.checkZoomLimits();
                
                var lenK = this.distance / distance0;
                this.position.x *= lenK;
                this.position.y *= lenK;
                this.position.z *= lenK;
            }
            
            this.updateViewMatrix();
        },
        /**
         * Check user input
         * 
         * @function
         */
        checkKeys: function() {
            var dx = 0;
            var dy = 0;
            var key;
            for (var i = 0; i < this.keys.length; i++) {
                key = this.keys[i];
                switch(key) {
                    case 39: // right
                        dx -= this.rotateKeySensibility;
                        break;
                    case 37: // left
                        dx += this.rotateKeySensibility;
                        break;
                    case 40: // down
                        dy -= this.rotateKeySensibility;
                        break;
                    case 38: // up
                        dy += this.rotateKeySensibility;
                        break;
                }
            }
            if (dx != 0 || dy != 0) {
                this.rotateXY(dx, dy);
            }
        },
        /**
         * Update rotation and distance according to position
         * 
         * @function
         */
        applyPosition: function() {
            this.distance = this.position.length();
            
            this.rotationX = Math.acos(this.position.y / this.distance) / U.PI_180;
            this.rotationY = -Math.atan2(this.position.z, this.position.x) / U.PI_180;
            if (this.rotationY < 0) {
                this.rotationY += 360;
            }
        },
        /**
         * Update position according to rotation
         * 
         * @function
         */
        applyRotation: function() {
            var rotYRad = this.rotationY * U.PI_180;
            var rotXRad = this.rotationX * U.PI_180;
            
            this.position.x = Math.sin(rotXRad) * Math.cos(rotYRad) * this.distance;
            this.position.y = Math.cos(rotXRad) * this.distance;
            this.position.z = -Math.sin(rotXRad) * Math.sin(rotYRad) * this.distance;
        },
        /**
         * This camera has some rotation limits
         * 
         * @function
         */
        checkRotateLimits: function() {
            if (this.rotationY >= 360 || this.rotationY <= -360) {
                this.rotationY = this.rotationY % 360;
            }
            if (this.rotationY < 0) {
                this.rotationY += 360;
            }
            if (this.rotationX >= 170) {
                this.rotationX = 170;
                this.rotateOffsetX = 0;
            } else if (this.rotationX <= 10) {
                this.rotationX = 10;
                this.rotateOffsetX = 0;
            }
        },
        /**
         * This camera supports zoom limits.
         * Use minDistance and maxDistance properties
         * 
         * @function
         */
        checkZoomLimits: function() {
            if (this.distance >= this.maxDistance) {
                this.distance = this.maxDistance;
                this.zoomOffset = 0;
            }
            if (this.distance <= this.minDistance) {
                this.distance = this.minDistance;
                this.zoomOffset = 0;
            }
        },
        updateMatrices: function() {
            this.updateProjectMatrix();
            this.updateViewMatrix();
        },
        updateProjectMatrix: function(aspect) {
            if (aspect) {
                this.aspect = aspect;
            }
            this.pMatrix.setPerspective(this.fovY, this.aspect, this.near, this.far);
        },
        updateViewMatrix: function() {
            this.vMatrix.setLookAt(
                this.position.x, 
                this.position.y, 
                this.position.z,
                0, 0, 0,
                0, 1, 0
            );
        },
        onMouseWheel: function(e) {
            if (!this.enabled) {
                return;
            }
            e.preventDefault();
            var dir = 1;
            if (e.wheelDelta) {
                dir = (e.wheelDelta > 0) ? 1 : -1;
            } else if (e.detail) {
                dir = (e.detail > 0) ? -1 : 1;
            }
            this.zoom(-dir);
        },
        zoom: function(dir) {
            this.zoomOffset = dir * this.zoomSensibility;
        },
        onMouseDown: function(e) {
            if (!this.enabled) {
                return;
            }
            this.mouse.down = true;
            var mousePos = getMousePos(e, this.canvas);
            this.mouse.x = mousePos.x;
            this.mouse.y = mousePos.y;
        },
        onMouseUp: function(e) {
            this.mouse.down = false;
        },
        onMouseOut: function(e) {
            this.mouse.down = false;
        },
        onMouseMove: function(e) {
            if (!this.enabled) {
                return;
            }
            if (!this.mouse.down) {
                return;
            }
            var mousePos = getMousePos(e, this.canvas);
            var dx = mousePos.x - this.mouse.x;
            var dy = mousePos.y - this.mouse.y;
            this.mouse.x = mousePos.x;
            this.mouse.y = mousePos.y;
            
            this.rotateXY(dx, dy);
        },
        rotateXY: function(dx, dy) {
            this.rotateOffsetX += -dy * this.rotateSensibility;
            this.rotateOffsetY += -dx * this.rotateSensibility;
        },
        onKeyDown: function(e) {
            if ([39, 37, 40, 38].indexOf(e.which) !== -1) {
                if (this.keys.indexOf(e.which) === -1) {
                    this.keys.push(e.which);
                }
            }
        },
        onKeyUp: function(e) {
            if ([39, 37, 40, 38].indexOf(e.which) !== -1) {
                var idx = this.keys.indexOf(e.which);
                if (idx >= 0) {
                    this.keys.splice(idx, 1);
                }
            }
        },
        /**
         * Attach control for camera
         * 
         * @function
         */
        attachControl: function(canvas) {
            this.canvas = canvas;
            var $this = this;
            var eventPrefix = 'mouse';
            canvas.addEventListener('DOMMouseScroll', function(e) { //firefox
                $this.onMouseWheel(e);
            }, false);
            canvas.addEventListener(eventPrefix + 'wheel', function(e) {
                $this.onMouseWheel(e);
            }, false);
            this.canvas.addEventListener(eventPrefix + 'down', function(e) {
                $this.onMouseDown(e);
            }, false);
            this.canvas.addEventListener(eventPrefix + 'move', function(e) {
                $this.onMouseMove(e);
            }, false);
            this.canvas.addEventListener(eventPrefix + 'up', function(e) {
                $this.onMouseUp(e);
            }, false);
            this.canvas.addEventListener(eventPrefix + 'out', function(e) {
                $this.onMouseOut(e);
            }, false);
            document.addEventListener('keydown', function(e) {
                $this.onKeyDown(e);
            }, false);
            document.addEventListener('keyup', function(e) {
                $this.onKeyUp(e);
            }, false);
        }
    };
    return Camera;
})();
/**
 * Mesh class
 * @class
 */
var Mesh = (function () {
    /**
     * @param {string} name
     * @param {array} vertices Aspect ratio
     * @param {array} indices Distance to near plane
     * @param {array} normals Distance to far plane
     * @param {Material} material
     */
    function Mesh(name, vertices, indices, normals, material) {
        this.isReady = false;
        
        this.name = name;

        this.vertices = new Float32Array(vertices);
        
        this.indices = new Uint8Array(indices);
        
        this.normals = new Float32Array(normals);
        
        this.textureCoords = new Float32Array([]);
        this.material = material;

        this.elementsCnt = indices.length;
        
        this.position = new Vector(0, 0, 0);
        this.rotation = new Vector(0, 0, 0);
        this.mMatrix = Matrix.Identity();
        this.parentMatrix = Matrix.Identity();
        this.worldMatrix = Matrix.Identity();
        this.data = null;
        // buffers
        this.vbo = null;
        this.ibo = null;
        this.nbo = null;
        this.tbo = null;
    }
    Mesh.prototype = {
        setTextureCoords: function(textureCoords) {
            this.textureCoords = new Float32Array(textureCoords);
        },
        updateMatrices: function() {
            // rotate
            // we need to rotate only around one of axis x, y or z
            if (this.rotation.x) {
                this.mMatrix.setRotateX(this.rotation.x);
            } else if (this.rotation.y) {
                this.mMatrix.setRotateY(this.rotation.y);
            } else if (this.rotation.z) {
                this.mMatrix.setRotateZ(this.rotation.z);
            } else {
                this.mMatrix.setIdentity();
            }
            // translate
            this.setTranslate(this.position.x, this.position.y, this.position.z);
        },
        updateWorldMatrix: function() {
            Matrix.multiplyTo(this.parentMatrix, this.mMatrix, this.worldMatrix);
        },
        setParentMatrix: function(parentMatrix) {
            this.parentMatrix = parentMatrix;
        },
        /**
         * Set mesh position
         * 
         * @function
         * 
         * @param {number} x
         * @param {number} y
         * @param {number} z
         */
        setTranslate: function(x, y, z) {
            this.position.x = x;
            this.position.y = y;
            this.position.z = z;
            this.mMatrix.makeTranslate(this.position.x, this.position.y, this.position.z);
        }
    };
    return Mesh;
})();
/**
 * SubCube class. Represents one small cube
 * @class
 */
var SubCube = (function () {
    function SubCube(name, cube) {
        this.cube = cube;
        this.name = name;
        
        this.sideMeshes = [];
        this.position = new Vector(0, 0, 0);
        this.rotation = new Vector(0, 0, 0);
        this.mMatrix = Matrix.Identity();
    }
    SubCube.prototype = {
        /**
         * Add side
         * 
         * @function
         * 
         * @param {Mesh} sideMesh
         */
        addSide: function(sideMesh) {
            sideMesh.setParentMatrix(this.mMatrix);
            this.sideMeshes.push(sideMesh);
            this.cube.meshes.push(sideMesh);
        }
    };
    SubCube.prototype.updateMatrices = Mesh.prototype.updateMatrices;
    SubCube.prototype.setTranslate = Mesh.prototype.setTranslate;
    return SubCube;
})();
/**
 * Light class
 * @class
 */
var Light = (function () {
    function Light(position) {
        this.position = new Vector(position.x, position.y, position.z);
    }
    return Light;
})();
/**
 * Material class
 * @class
 */
var Material = (function () {
    /**
     * @param {string} name
     * @param {Vector} color
     * @param {string} textureSrc
     * @param {object} gl
     */
    function Material(name, color, textureSrc, gl) {
        this.name = name;
        this.color = color;

        this.textureSrc = textureSrc;
        this.textureImg = null;

        this.cbo = null;
        this.colors = null;
        this.gl = gl;
        
        this.initTexture();
    }
    Material.prototype = {
        setColors: function(colors) {
            this.colors = new Float32Array(colors);
        },
        /**
         * Initialize textures
         * 
         * @function
         */
        initTexture: function() {
            var r = U.colorFloat2Int(this.color.x);
            var g = U.colorFloat2Int(this.color.y);
            var b = U.colorFloat2Int(this.color.z);
            this.textureData = new Uint8Array([r, g, b]);
            this.texture = this.gl.createTexture();
            
            this.prepareTexture();
        },
        prepareTexture: function() {
            this.gl.activeTexture(this.gl.TEXTURE0);
            var t2 = this.gl[o_t2d];
            this.gl.bindTexture(t2, this.texture);
            this.gl.texParameteri(t2, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(t2, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);

            if (this.textureSrc) {
                this.textureImg = new Image();
                this.textureImg.src = this.textureSrc;
                this.gl.texImage2D(t2, 0, this.gl.RGB, this.gl.RGB, this.gl.UNSIGNED_BYTE, this.textureImg);
            } else {
                this.gl.texImage2D(t2, 0, this.gl.RGB, 1, 1, 0, this.gl.RGB, this.gl.UNSIGNED_BYTE, this.textureData);
            }
            this.gl.bindTexture(t2, null);
        }
    };
    return Material;
})();

GlitchCube.prototype = {
    // vertext shader
    vxShader: [
        'attribute vec3 aPosition;',
        'attribute vec3 aNormal;',
        'attribute vec4 aColor;',
        'uniform mat4 uPMatrix;',
        'uniform mat4 uVMatrix;',
        'uniform mat4 uMMatrix;',
        'uniform mat4 uNMatrix;',
        'uniform vec3 uLP;',
        'varying vec4 vColor;',
        'varying vec2 vTextureCoord;',
        'attribute vec2 aTexCoords;',
        'void main(void) {',
            'vec4 v = uMMatrix * vec4(aPosition, 1.0);',
            'vec3 n = vec3(uNMatrix * vec4(aNormal, 1.0));',
            'vec4 lP = vec4(uLP, 1.0);',
            'vec3 lR = v.xyz - lP.xyz;',
            'float lT = max(dot(normalize(n), -normalize(lR)), 0.0);',
            'vec3 d = vec3(1.0, 1.0, 1.0) * aColor.rgb * lT;',
            'vec3 a = vec3(0.4, 0.4, 0.4) * aColor.rgb;',
            'vColor = vec4(a + d, aColor.a);',
            'vTextureCoord = aTexCoords;',
            
            'gl_Position = uPMatrix * uVMatrix * v;',
       '}'
    ],
    // fragment shader
    fgShader: [
        '#ifdef GL_ES',
        'precision mediump float;',
        '#endif',
        'varying vec4 vColor;',
        'uniform sampler2D uSampler;',
        'varying vec2 vTextureCoord;',
        'void main(void) {',
            'gl_FragColor = vColor * texture2D(uSampler, vTextureCoord);',
        '}'
    ],
    meshes: [],
    cubes: [],
    width: 800,
    height: 600,
    maxHeight: 8640,
    maxWidth: 15360,
    minHeight: 100,
    minWidth: 100,
    
    sceneSize: 260,
    animationRatio: 1,
    deltaTime: 0,
    
    currentFrame: null,
    currentDir: null,
    currentSubCubes: [],
    animating: false,
    rotAngle: 0,
    rotSpeed: 2,
    frameTimestamps: [],
    // side mesh prototype
    sideMeshProto: null,
    
    subCubeBoundSize: 20,
    cubeBoundSizeHalf: 30,
    cubeVertices: [],
    sideIndices: {
        F: {indices: [43, 42, 41, 40, 47, 46, 45, 44, 51, 50, 49, 48, 55, 54, 53, 52], cellsOrder: [19, 18, 17, 22, 21, 20, 25, 24, 23]}, // far
        N: {indices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], cellsOrder: [0, 1, 2, 3, 4, 5, 6, 7, 8]}, // near
        R: {indices: [3, 19, 31, 43, 7, 21, 33, 47, 11, 23, 35, 51, 15, 27, 39, 55], cellsOrder: [2, 11, 19, 5, 13, 22, 8, 16, 25]}, // right
        L: {indices: [40, 28, 16, 0, 44, 32, 20, 4, 48, 34, 22, 8, 52, 36, 24, 12], cellsOrder: [17, 9, 0, 20, 12, 3, 23, 14, 6]}, // left
        T: {indices: [40, 41, 42, 43, 28, 29, 30, 31, 16, 17, 18, 19, 0, 1, 2, 3], cellsOrder: [17, 18, 19, 9, 10, 11, 0, 1, 2]}, // top
        B: {indices: [12, 13, 14, 15, 24, 25, 26, 27, 36, 37, 38, 39, 52, 53, 54, 55], cellsOrder: [6, 7, 8, 14, 15, 16, 23, 24, 25]} // bottom
    },
    mouseDown: null,
    mouseSensitivity: 60,
    mouseAngleSensitivity: 0.86,
    pickableMeshes: null,
    
    scrambles: [],
    scramblesMax: 100, // 100
    scramblesMin: 20, // 20
    // how many moves user did
    movesCnt: 0,
    
    sounds: {
        rotate: null
    },
    mute: false,
    paused: true,
    solved: false,
    
    cameraInitialPosition: [-95, 95, -95],
    X0: -20,
    X1: 0,
    X2: 20,
    Y0: -20,
    Y1: 0,
    Y2: 20,
    Z0: 20,
    Z1: 0,
    Z2: -20,
    rotRadius2: 20,
    subCubeSize: 19.6,
    subCubeSizeHalf: 9.8,
    sides: {
        // far plane
        F: {rotation: null, position: null, material: null, color: new Vector(1, 0, 0), texture: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgBAMAAACBVGfHAAAAMFBMVEW1RU+zQUuyPUewOUSvNUCtMj2sLjmlHSmqKjW2SFKpJjKnIy6gEh6jFyOnIi60Q05U7/FtAAAAiElEQVQoz2OYiQYY5jOggQmCKECAYYKQEjIACRgjASOQgIkLAkAEQuEgBCIQlgYDMIEOKGiDCXStggCEwG4g2Ld7F0LgeTkIYBWQhwhsr7179y5EBUzgzJmzeAWeky6AaQvIGZgCr5D88nr3u92vX2HzrTxqeGCGGEaYYoY6Zrxgxhxm3KJFPgDNgLNYLci3PAAAAABJRU5ErkJggg=='},
        // near
        N: {rotation: null, position: null, material: null, color: new Vector(1, 0.4, 0.1), texture: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgBAMAAACBVGfHAAAAKlBMVEXSaj7RZzrQZDbPYTLOXi7NWyrMWCbKThrUcEXTbULMVSPLUh/IShTHRA0hDlrBAAAAhklEQVQoz2PoQAMMnTNRAUMnAxroZBREBgJAASVkABJQNkYAI7CACwJABFxDYSAEKpAGAzCBrFUQsAwusBsCEALby0GgGkng+PHy4ygCZ0AAReDu3bsYAseRBWpAKggKHMcQQLcWVcWZ8jPl1RhOx/QchvcxAwgjCDEDGSMaMCMKIyoxIhsAltix7OSYuZgAAAAASUVORK5CYII='},
        // right
        R: {rotation: null, position: null, material: null, color: new Vector(0, 0, 1), texture: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAPFBMVEU6XJtCY58yVpc+YJ0nTJE2WZkjSY8rUJMvU5UfRo0bQ4sXQIk2WplGZqE+X50uU5UTPIcqT5MPOYUKNYPbl7CgAAAA50lEQVQ4y4WT4RaCIAxGTSSoaIt6/3ftO2M4XaFXh/txz0Q2p+flGAgUAm4JrBQUTSCE6QCCQFMssVFKQeAZ9TG1CnEeYEIGzFlggBXZXFQoc661plRxAckQrAL2AGH5QQTqQlqujiWx7UGE244rKkCgrXDfACFlrUCr8FgxQStwE15KE/iP8Ba8IOegwgeY4Pbghew+c1xh9Ar0wiqcbZK1gmJ70F6I4A+qdgEVRkddrBfVNcsEq+CAsO+mx38mqLj6yCH23cyswypLbmFDezr2MdrfEiWQgT7VY0RY/1WyhEhSAOGYL9WZGqRFMI5RAAAAAElFTkSuQmCC'},
        // left
        L: {rotation: null, position: null, material: null, color: new Vector(0, 1, 0), texture: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgBAMAAACBVGfHAAAAMFBMVEU7hYg3g4YzgIQ/iIsvfoEre38neXwjdnpCio0fdHgbcXUXb3MTbXAPam4LaGwHZWkbt3HCAAAAgUlEQVQoz2PoQAMMzcaogKGZAQ00MwoiAwGggBIyAAmouCCAE1ggFAEgAmFpMJAKFSiHAZhA5UwImA4XWAUBCIHVu0FgF5LAGRBAFjh79+7dOygC7969QxV4//8fqQIIMzBtwXQHwqWYfsHwLWZ4YIQYZphihDpmvGDEHEbcYsQ+AN/tuGg9zG1XAAAAAElFTkSuQmCC'},
        // top
        T: {rotation: null, position: null, material: null, color: new Vector(1, 1, 0), texture: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgBAMAAACBVGfHAAAAKlBMVEW6qTi+r0W9rUG8rD3AsEm4pzK3pS7Bskyxnh61oyu0oiezoCOvmxitmRTNMUURAAAAfElEQVQoz2MoRwMMJS6ogKFEEBUwlAgpIQNFoIAxMgAJGDAwMDNAATNUgAFVgDUUBgKgAmkwABPInAkB0+ACqyAAIbB6NwjsQhLoAAH8AmfOnEER6Dl79w6qCsICCDMIW4vpUky/YPoWMzwQIYYRppgCmPGCEXMYcYsR+wCNi5kRMtR5DgAAAABJRU5ErkJggg=='},
        // bottom
        B: {rotation: null, position: null, material: null, color: new Vector(0.8, 0.8, 0.8), texture: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgBAMAAACBVGfHAAAAGFBMVEXJyMzHxsrFxMjMy8/Lys7DwsbAv8S+vcJPPtDnAAAAoUlEQVQoz22RgQnEIAxFPegAbUcoOIEOcKATFHQD0w3q+pcEE/T0Fa08vhKjcX8Yzz+aowssorLhCMabgYjis+MCB0OJo0PFKSLid1wKJ0hYFZFFamhiFiUDQBFxXikD0SXghVoHUWt9J1FGMW1ZnnFrpfDUhxJN2ARTHQBZRFzcxYq4WQwN2vlyU8cQ6eu668reHqqH6hC+G83BOCQ4xf8AvahbwP3i5kwAAAAASUVORK5CYII='}
    },
    backSide: {rotation: null, position: null, material: null, color: new Vector(0.5, 0.5, 0.5), texture: null},
    rules: { // rotation rules
        X: ['F', 'T', 'N', 'B', 'F'],
        Y: ['F', 'L', 'N', 'R', 'F'],
        Z: ['R', 'T', 'L', 'B', 'R']
    },
    cells: [
        // s - sides, f - frames, r - rules, rot - rotation properties, pos - position category
        {s: ['L', 'T', 'N'], f: ['X0', 'Y2', 'Z0'], r: {'X+': 6,  'X-': 17, 'Y+': 2,  'Y-': 17, 'Z-': 2,  'Z+': 6},  rot: {X: 135, Y: 225, Z: 135}, pos: 1}, // 0
        {s: [     'T', 'N'], f: ['X1', 'Y2', 'Z0'], r: {'X+': 7,  'X-': 18, 'Y+': 11, 'Y-': 9,  'Z-': 5,  'Z+': 3},  rot: {X: 135, Y: 270, Z: 90},  pos: 2}, // 1
        {s: ['R', 'T', 'N'], f: ['X2', 'Y2', 'Z0'], r: {'X+': 8,  'X-': 19, 'Y+': 19, 'Y-': 0,  'Z-': 8,  'Z+': 0},  rot: {X: 135, Y: 315, Z: 45},  pos: 1}, // 2
        {s: ['L',      'N'], f: ['X0', 'Y1', 'Z0'], r: {'X+': 14, 'X-': 9,  'Y+': 5,  'Y-': 20, 'Z-': 1,  'Z+': 7},  rot: {X: 180, Y: 225, Z: 180}, pos: 2}, // 3
        {s: [          'N'], f: ['X1', 'Y1', 'Z0'], r: {'X+': 15, 'X-': 10, 'Y+': 13, 'Y-': 12, 'Z-': 4,  'Z+': 4},  rot: {X: 180, Y: 270, Z: 0},   pos: 3}, // 4
        {s: ['R',      'N'], f: ['X2', 'Y1', 'Z0'], r: {'X+': 16, 'X-': 11, 'Y+': 22, 'Y-': 3,  'Z-': 7,  'Z+': 1},  rot: {X: 180, Y: 315, Z: 0},   pos: 2}, // 5
        {s: ['L', 'B', 'N'], f: ['X0', 'Y0', 'Z0'], r: {'X+': 23, 'X-': 0,  'Y+': 8,  'Y-': 23, 'Z-': 0,  'Z+': 8},  rot: {X: 225, Y: 225, Z: 225}, pos: 1}, // 6
        {s: [     'B', 'N'], f: ['X1', 'Y0', 'Z0'], r: {'X+': 24, 'X-': 1,  'Y+': 16, 'Y-': 14, 'Z-': 3,  'Z+': 5},  rot: {X: 225, Y: 270, Z: 270}, pos: 2}, // 7
        {s: ['R', 'B', 'N'], f: ['X2', 'Y0', 'Z0'], r: {'X+': 25, 'X-': 2,  'Y+': 25, 'Y-': 6,  'Z-': 6,  'Z+': 2},  rot: {X: 225, Y: 315, Z: 315}, pos: 1}, // 8
        
        {s: ['L', 'T'     ], f: ['X0', 'Y2', 'Z1'], r: {'X+': 3,  'X-': 20, 'Y+': 1,  'Y-': 18, 'Z-': 11, 'Z+': 14}, rot: {X: 90,  Y: 180, Z: 135}, pos: 2}, // 9
        {s: [     'T'     ], f: ['X1', 'Y2', 'Z1'], r: {'X+': 4,  'X-': 21, 'Y+': 10, 'Y-': 10, 'Z-': 13, 'Z+': 12}, rot: {X: 90,  Y: 0,   Z: 90},  pos: 3}, // 10
        {s: ['R', 'T'     ], f: ['X2', 'Y2', 'Z1'], r: {'X+': 5,  'X-': 22, 'Y+': 18, 'Y-': 1,  'Z-': 16, 'Z+': 9},  rot: {X: 90,  Y: 0,   Z: 45},  pos: 2}, // 11
        {s: ['L'          ], f: ['X0', 'Y1', 'Z1'], r: {'X+': 12, 'X-': 12, 'Y+': 4,  'Y-': 21, 'Z-': 10, 'Z+': 15}, rot: {X: 0,   Y: 180, Z: 180}, pos: 3}, // 12
        {s: ['R'          ], f: ['X2', 'Y1', 'Z1'], r: {'X+': 13, 'X-': 13, 'Y+': 21, 'Y-': 4,  'Z-': 15, 'Z+': 10}, rot: {X: 0,   Y: 0,   Z: 0},   pos: 3}, // 13
        {s: ['L', 'B'     ], f: ['X0', 'Y0', 'Z1'], r: {'X+': 20, 'X-': 3,  'Y+': 7,  'Y-': 24, 'Z-': 9,  'Z+': 16}, rot: {X: 270, Y: 180, Z: 225}, pos: 2}, // 14
        {s: [     'B'     ], f: ['X1', 'Y0', 'Z1'], r: {'X+': 21, 'X-': 4,  'Y+': 15, 'Y-': 15, 'Z-': 12, 'Z+': 13}, rot: {X: 270, Y: 0,   Z: 270}, pos: 3}, // 15
        {s: ['R', 'B'     ], f: ['X2', 'Y0', 'Z1'], r: {'X+': 22, 'X-': 5,  'Y+': 24, 'Y-': 7,  'Z-': 14, 'Z+': 11}, rot: {X: 270, Y: 0,   Z: 315}, pos: 2}, // 16
        
        {s: ['L', 'T', 'F'], f: ['X0', 'Y2', 'Z2'], r: {'X+': 0,  'X-': 23, 'Y+': 0,  'Y-': 19, 'Z-': 19, 'Z+': 23}, rot: {X: 45,  Y: 135, Z: 135}, pos: 1}, // 17
        {s: [     'T', 'F'], f: ['X1', 'Y2', 'Z2'], r: {'X+': 1,  'X-': 24, 'Y+': 9,  'Y-': 11, 'Z-': 22, 'Z+': 20}, rot: {X: 45,  Y: 90,  Z: 90},  pos: 2}, // 18
        {s: ['R', 'T', 'F'], f: ['X2', 'Y2', 'Z2'], r: {'X+': 2,  'X-': 25, 'Y+': 17, 'Y-': 2,  'Z-': 25, 'Z+': 17}, rot: {X: 45,  Y: 45,  Z: 45},  pos: 1}, // 19
        {s: ['L',      'F'], f: ['X0', 'Y1', 'Z2'], r: {'X+': 9,  'X-': 14, 'Y+': 3,  'Y-': 22, 'Z-': 18, 'Z+': 24}, rot: {X: 0,   Y: 135, Z: 180}, pos: 2}, // 20
        {s: [          'F'], f: ['X1', 'Y1', 'Z2'], r: {'X+': 10, 'X-': 15, 'Y+': 12, 'Y-': 13, 'Z-': 21, 'Z+': 21}, rot: {X: 0,   Y: 90,  Z: 0},   pos: 3}, // 21
        {s: ['R',      'F'], f: ['X2', 'Y1', 'Z2'], r: {'X+': 11, 'X-': 16, 'Y+': 20, 'Y-': 5,  'Z-': 24, 'Z+': 18}, rot: {X: 0,   Y: 45,  Z: 0},   pos: 2}, // 22
        {s: ['L', 'B', 'F'], f: ['X0', 'Y0', 'Z2'], r: {'X+': 17, 'X-': 6,  'Y+': 6,  'Y-': 25, 'Z-': 17, 'Z+': 25}, rot: {X: 315, Y: 135, Z: 225}, pos: 1}, // 23
        {s: [     'B', 'F'], f: ['X1', 'Y0', 'Z2'], r: {'X+': 18, 'X-': 7,  'Y+': 14, 'Y-': 16, 'Z-': 20, 'Z+': 22}, rot: {X: 315, Y: 90,  Z: 270}, pos: 2}, // 24
        {s: ['R', 'B', 'F'], f: ['X2', 'Y0', 'Z2'], r: {'X+': 19, 'X-': 8,  'Y+': 23, 'Y-': 8,  'Z-': 23, 'Z+': 19}, rot: {X: 315, Y: 45,  Z: 315}, pos: 1}  // 25
    ],
    
    init: function(canvasId) {
        var $this = this;
        
        this.canvas = document.getElementById(canvasId);
        
        if (!this.isSupported()) {
            alert('Browser not supported');
            return this;
        }
        this.initContext();
        
        this.halfSceneSize = this.sceneSize / 2;
        this.rotRadius1 = Math.sqrt(2 * this.rotRadius2 * this.rotRadius2);
        
        this.handleSize();
        
        this.initCamera();
        
        if (!this.initProgram()) {
            return this;
        }
        // this a normal matrix
        this.nMatrix = Matrix.Identity();
        this.light = new Light(new Vector(0, 0, 0));
        this.light.position = this.camera.position;
        
        this.initSounds();
        
        this.initSides();
        this.createCube();
        
        this.initBuffers();
        
        window.addEventListener('resize', function() {
            $this.handleSize();
        });
        
        this.scramble();
        
        // this.initKeyboardControls();
        this.initMouseControls();
        
        this.initHud();
        this.initMenu();
        
        this.run();
        
        this.setPaused(false);
        return this;
    },
    initCamera: function() {
        // fov is in radians! 0.8 = ~45.84deg
        this.camera = new Camera(
            0.8,
            this.width / this.height,
            1, 260,
            new Vector(
                this.cameraInitialPosition[0], 
                this.cameraInitialPosition[1], 
                -this.cameraInitialPosition[2]
            )
        );
    },
    initMeshBuffers: function(mesh) {
        var oAb = this.gl[o_ab];
        var oSd = this.gl[o_sd];
        try {
            mesh.vbo = this.createBuffer('vbo', mesh.name);
            mesh.nbo = this.createBuffer('nbo', mesh.name);
            if (!mesh.material.cbo) {
                mesh.material.cbo = this.createBuffer('cbo', mesh.name);
                this.gl.bindBuffer(oAb, mesh.material.cbo);
                this.gl.bufferData(oAb, mesh.material.colors, oSd);
            }
        } catch (e) {
            return false;
        }
        this.gl.bindBuffer(oAb, mesh.vbo);
        this.gl.bufferData(oAb, mesh.vertices, oSd);
        
        this.gl.bindBuffer(oAb, mesh.nbo);
        this.gl.bufferData(oAb, mesh.normals, oSd);
        
        if (mesh.indices.length) {
            try {
                mesh.ibo = this.createBuffer('ibo', mesh.name);
            } catch (e) {
                return false;
            }
            this.gl.bindBuffer(this.gl[o_eab], mesh.ibo);
            this.gl.bufferData(this.gl[o_eab], mesh.indices, oSd);
        }
        if (mesh.textureCoords.length) {
            try {
                mesh.tbo = this.createBuffer('tbo', mesh.name);
            } catch (e) {
                return false;
            }
            this.gl.bindBuffer(oAb, mesh.tbo);
            this.gl.bufferData(oAb, mesh.textureCoords, oSd);
        }
        mesh.isReady = true;
        return true;
    },
    createBuffer: function(name, meshName) {
        var b = this.gl.createBuffer();
        if (!b) {
            return false;
        }
        return b;
    },
    initSideMeshProtoBuffers: function() {
        var oSd = this.gl[o_sd];
        var mesh = this.sideMeshProto;
        try {
            mesh.vbo = this.createBuffer('vbo', mesh.name);
            mesh.nbo = this.createBuffer('nbo', mesh.name);
            mesh.ibo = this.createBuffer('ibo', mesh.name);
            mesh.tbo = this.createBuffer('tbo', mesh.name);
        } catch (e) {
            return false;
        }
        var oAb = this.gl[o_ab];
        this.gl.bindBuffer(oAb, mesh.vbo);
        this.gl.bufferData(oAb, mesh.vertices, oSd);
        
        this.gl.bindBuffer(oAb, mesh.nbo);
        this.gl.bufferData(oAb, mesh.normals, oSd);
        
        this.gl.bindBuffer(this.gl[o_eab], mesh.ibo);
        this.gl.bufferData(this.gl[o_eab], mesh.indices, oSd);
        
        this.gl.bindBuffer(oAb, mesh.tbo);
        this.gl.bufferData(oAb, mesh.textureCoords, oSd);
        mesh.isReady = true;
        return true;
    },
    initSideMeshBuffers: function(mesh) {
        var oAb = this.gl[o_ab];
        try {
            if (!mesh.material.cbo) {
                mesh.material.cbo = this.createBuffer('cbo', mesh.name);
                this.gl.bindBuffer(oAb, mesh.material.cbo);
                this.gl.bufferData(oAb, mesh.material.colors, this.gl[o_sd]);
            }
        } catch (e) {
            return false;
        }
        mesh.isReady = true;
        return true;
    },
    initBuffers: function() {
        var $this = this;
        this.initSideMeshProtoBuffers();
        if (this.sideMeshProto.isReady) {
            this.meshes.forEach(function(mesh) {
                $this.initSideMeshBuffers(mesh);
            });
        }
        
        // unbind buffers
        this.gl.bindBuffer(this.gl[o_ab], null);
        this.gl.bindBuffer(this.gl[o_eab], null);
    },
    calculateNMatrix: function(mesh) {
        mesh.updateWorldMatrix();
        this.nMatrix.setInverseOf(mesh.worldMatrix);
        this.nMatrix.transpose();
    },
    drawSideMesh: function(mesh, prevMaterialName) {
        if (!mesh.isReady) {
            return;
        }
        
        this.calculateNMatrix(mesh);
        this.gl.uniformMatrix4fv(this.prg.uMMatrix, false, mesh.worldMatrix.elements);
        this.gl.uniformMatrix4fv(this.prg.uNMatrix, false, this.nMatrix.elements);
        if (prevMaterialName !== mesh.material.name) {
            this.gl.bindBuffer(this.gl[o_ab], mesh.material.cbo);
            this.gl.vertexAttribPointer(this.prg.aColor, 3, this.gl.FLOAT, false, 0, 0);
            this.gl.bindTexture(this.gl[o_t2d], mesh.material.texture);
        }
        this.gl.drawElements(this.gl.TRIANGLES, mesh.elementsCnt, this.gl.UNSIGNED_BYTE, 0);
    },
    drawMeshes: function() {
        var $this = this;
        this.gl.uniformMatrix4fv(this.prg.uPMatrix, false, this.camera.pMatrix.elements);
        this.gl.uniformMatrix4fv(this.prg.uVMatrix, false, this.camera.vMatrix.elements);
        
        this.gl.uniform3fv(this.prg.uLP, this.light.position.toArray());
        
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.uniform1i(this.prg.uSampler, 0);
        
        this.gl.enableVertexAttribArray(this.prg.aPosition);
        this.gl.enableVertexAttribArray(this.prg.aNormal);
        this.gl.enableVertexAttribArray(this.prg.aColor);
        
        var oAb = this.gl[o_ab];
        // bind common buffers
        this.gl.bindBuffer(oAb, this.sideMeshProto.vbo);
        this.gl.vertexAttribPointer(this.prg.aPosition, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.bindBuffer(oAb, this.sideMeshProto.nbo);
        this.gl.vertexAttribPointer(this.prg.aNormal, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.bindBuffer(this.gl[o_eab], this.sideMeshProto.ibo);
        
        this.gl.enableVertexAttribArray(this.prg.aTexCoords);
        this.gl.bindBuffer(oAb, this.sideMeshProto.tbo);
        this.gl.vertexAttribPointer(this.prg.aTexCoords, 2, this.gl.FLOAT, false, 0, 0);
        
        var prevMaterialName = '';
        this.meshes.forEach(function(mesh) {
            $this.drawSideMesh(mesh, prevMaterialName);
            prevMaterialName = mesh.material.name;
        });
        
        // unbind buffers
        this.gl.bindBuffer(oAb, null);
        this.gl.bindBuffer(this.gl[o_eab], null);
        this.gl.bindTexture(this.gl[o_t2d], null);
    },
    render: function() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        
        this.drawMeshes();
    },
    /**
     * This is used to count animationRatio.
     * animationRatio is usefull when fps is not constant.
     * 
     * @function
     */
    measureStat: function(t) {
        if (t <= 0) {
            return;
        }
        this.frameTimestamps.push(t);
        var len = this.frameTimestamps.length;
        if (len >= 2) {
            this.deltaTime = this.frameTimestamps[len - 1] - this.frameTimestamps[len - 2];
        }
        var deltaTime = Math.max(1, Math.min(this.deltaTime, 1000));
        this.animationRatio = deltaTime * (60.0 / 1000.0);
        
        if (len > 61) {
            this.frameTimestamps.shift();
        }
    },
    renderLoopUpdate: function() {
        if (this.animating) {
            // rotate frames
            this.rotatingFrame();
        }
        // update camera position and its matrices
        this.camera.update();
    },
    renderLoop: function(t2, t1) {
        this.measureStat(t2);
        if (!this.paused) {
            this.renderLoopUpdate();
            this.render();
            if (this.solved) {
                // if solved call win function to finish a game
                var $this = this;
                setTimeout(function() {
                  $this.win();
              }, 0);
            }
        }
        this.requestFrame(t2);
    },
    requestFrame: function(t1) {
        var $this = this;
        window.requestAnimationFrame(function(t2) {
            $this.renderLoop(t2, t1);
        });
    },
    /**
     * Create a shader
     * 
     * @function
     * 
     * @param {object} gl
     * @param {string} src
     * @param {number} type One of gl constants: VERTEX_SHADER or FRAGMENT_SHADER
     */
    createShader: function(gl, src, type) {
        var shader = gl.createShader(type);
        
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (!compiled) {
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    },
    /**
     * Create shaders, a WebGL Program and other initialization
     * 
     * @function
     */
    initProgram: function() {
        var shaderSrc = this.vxShader.join('\n');
        var vxShader = this.createShader(this.gl, shaderSrc, this.gl.VERTEX_SHADER);
        shaderSrc = this.fgShader.join('\n');
        var fgShader = this.createShader(this.gl, shaderSrc, this.gl.FRAGMENT_SHADER);
        if (!vxShader || !fgShader) {
            return false;
        }
        var prg = this.gl.createProgram();
        this.gl.attachShader(prg, vxShader);
        this.gl.attachShader(prg, fgShader);
        this.gl.linkProgram(prg);
        // check link status
        var linked = this.gl.getProgramParameter(prg, this.gl.LINK_STATUS);
        if (!linked) {
            this.gl.deleteProgram(prg);
            this.gl.deleteShader(fgShader);
            this.gl.deleteShader(vxShader);
            return false;
        }
        this.prg = prg;
        this.gl.useProgram(this.prg);
        
        try {
            this.prg.aPosition = this.getAttribLocation('aPosition');
            this.prg.aNormal = this.getAttribLocation('aNormal');
            this.prg.aColor = this.getAttribLocation('aColor');
            this.prg.aTexCoords = this.getAttribLocation('aTexCoords');
            
            this.prg.uPMatrix = this.getUniformLocation('uPMatrix');
            this.prg.uVMatrix = this.getUniformLocation('uVMatrix');
            this.prg.uMMatrix = this.getUniformLocation('uMMatrix');
            this.prg.uNMatrix = this.getUniformLocation('uNMatrix');
            this.prg.uLP = this.getUniformLocation('uLP');
            this.prg.uSampler = this.getUniformLocation('uSampler');
        } catch (e) {
            return false;
        }
        
        return true;
    },
    getAttribLocation: function(name) {
        var loc = this.gl.getAttribLocation(this.prg, name);
        if (loc < 0) {
            throw new Error(name);
        }
        return loc;
    },
    getUniformLocation: function(name) {
        var loc = this.gl.getUniformLocation(this.prg, name);
        if (!loc) {
            throw new Error(name);
        }
        return loc;
    },
    getAvailableSpace: function() {
        var s = {w: 0, h: 0};
        s.w = window.innerWidth;
        s.h = window.innerHeight;
        return s;
    },
    calcSize: function() {
        var availSp = this.getAvailableSpace();
        var h = availSp.h;
        var w = availSp.w;
        h = Math.max(this.minHeight, Math.min(h, this.maxHeight));
        w = Math.max(this.minWidth, Math.min(w, this.maxWidth));
        return {w: w, h: h};
    },
    /**
     * This game fills all client space. 
     * When user resize browser window we should update some things.
     * 
     * @function
     */
    handleSize: function() {
        var s = this.calcSize();
        this.width = s.w;
        this.height = s.h;
        
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        
        this.gl.viewport(0, 0, this.width, this.height);
        
        if (this.camera) {
            var aspect = this.width / this.height;
            this.camera.updateProjectMatrix(aspect);
        }
    },
    /**
     * Initialize webGL context
     * 
     * @function
     */
    initContext: function() {
        if (!this.gl) {
            var ctxParams = {antialias: true};
            // experimental-webgl - for IE11
            var glContextNames = ['webgl', 'experimental-webgl'];
            var gl = null;
            for (var i = 0; i < glContextNames.length; i++) {
                try {
                    gl = this.canvas.getContext(glContextNames[i], ctxParams);
                    if (gl != null && !!window.WebGLRenderingContext) {
                        this.gl = gl;
                        return this.gl;
                    }
                } catch(e) {}
            }
        }
        return this.gl;
    },
    isSupported: function() {
        this.initContext();
        return !!this.gl;
    },
    /**
     * Create html menu
     * 
     * @function
     */
    initMenu: function() {
        var $this = this;
        this.menuContainer = document.createElement('div');
        this.menuContainer.id = 'menu';
        
        var buttonNew = document.createElement('button');
        buttonNew.textContent = 'New Game';
        buttonNew.addEventListener('click', function() {
            var c = confirm('Are you sure?');
            if (c) $this.reset();
        }, false);
        
        this.menuContainer.appendChild(buttonNew);
        
        document.body.appendChild(this.menuContainer);
    },
    /**
     * Create html HUD
     * 
     * @function
     */
    initHud: function() {
        this.hudContainer = document.createElement('div');
        this.hudContainer.id = 'hud';
        
        this.movesContainer = document.createElement('span');
        this.hudContainer.appendChild(this.movesContainer);
        
        this.movesContainer.textContent = '0';
        
        document.body.appendChild(this.hudContainer);
    },
    updateHud: function() {
        this.movesContainer.textContent = this.movesCnt;
    },
    initSounds: function() {
        this.sounds.rotate = new Audio('data:audio/wav;base64,UklGRr0AAABXQVZFZm10IBAAAAABAAEAiBUAAIgVAAABAAgAZGF0YZkAAACjoZ5wV1pcXmBiZGZnaX2xrqtqY2VmaGlrbG1ucJW2sqZmaGlrbG1ub3Bxcqm3s5Voamtsbm9wcXJzdLq3s4Rpa2xtbnBwcXJzh7q2s3Jqa21ub3BxcnNzmbm1qWlrbG1ub3BxcnN0q7i1lmprbG1ucHFxcnN1u7e0hGprbG5vcHFyc3OHurazcmpsbW5vcHFyc3SZubSgdHo=');
    },
    /**
     * Play sound by name
     * 
     * @function
     * 
     * @param {string} name Sound name
     */
    playSound: function(name) {
        var sound = this.sounds[name];
        if (sound.readyState >= 2) {
            sound.play();
        }
    },
    initCubeVertices: function() {
        var edgeX0 = -this.cubeBoundSizeHalf;
        var edgeZ0 = this.cubeBoundSizeHalf;
        var edgeY2 = this.cubeBoundSizeHalf;
        
        var x = edgeX0;
        var z = edgeZ0;
        var y = edgeY2;
        for (var i = 1; i <= 16; i++) {
            this.cubeVertices.push(new Vector(x, y, z));
            x += this.subCubeBoundSize;
            if (i % 4 === 0) {
                x = edgeX0;
                y -= this.subCubeBoundSize;
            }
        }
        
        z -= this.subCubeBoundSize;
        y = edgeY2;
        for (var i = 1; i <= 16; i++) {
            if (i !== 6 && i !== 7 && i !== 10 && i !== 11) {
                this.cubeVertices.push(new Vector(x, y, z));
            }
            x += this.subCubeBoundSize;
            if (i % 4 === 0) {
                x = edgeX0;
                y -= this.subCubeBoundSize;
            }
        }
        
        z -= this.subCubeBoundSize;
        y = edgeY2;
        for (var i = 1; i <= 16; i++) {
            if (i !== 6 && i !== 7 && i !== 10 && i !== 11) {
                this.cubeVertices.push(new Vector(x, y, z));
            }
            x += this.subCubeBoundSize;
            if (i % 4 === 0) {
                x = edgeX0;
                y -= this.subCubeBoundSize;
            }
        }
        
        y = edgeY2;
        z -= this.subCubeBoundSize;
        for (var i = 1; i <= 16; i++) {
            this.cubeVertices.push(new Vector(x, y, z));
            x += this.subCubeBoundSize;
            if (i % 4 === 0) {
                x = edgeX0;
                y -= this.subCubeBoundSize;
            }
        }
    },
    getVisibleSides: function() {
        var sides = [];
        sides.push({n: 'F', v: this.sideVisibility(new Vector(0, 0, -this.cubeBoundSizeHalf))});
        sides.push({n: 'N', v: this.sideVisibility(new Vector(0, 0, this.cubeBoundSizeHalf))});
        sides.push({n: 'R', v: this.sideVisibility(new Vector(this.cubeBoundSizeHalf, 0, 0))});
        sides.push({n: 'L', v: this.sideVisibility(new Vector(-this.cubeBoundSizeHalf, 0, 0))});
        sides.push({n: 'T', v: this.sideVisibility(new Vector(0, this.cubeBoundSizeHalf, 0))});
        sides.push({n: 'B', v: this.sideVisibility(new Vector(0, -this.cubeBoundSizeHalf, 0))});
        
        sides.sort(function(s1, s2) {
            return s2.v - s1.v;
        });
        return sides;
    },
    sideVisibility: function(n) {
        var cameraPos = Vector.sub(this.camera.position, n);
        cameraPos.normalize();
        n.normalize();
        return cameraPos.dot(n);
    },
    intersectLine: function(pos, vertex1, vertex2) {
        var point1 = vertex1;
        var point2 = vertex2;
        var y = null;
        if (vertex1.x > vertex2.x) {
            point1 = vertex2;
            point2 = vertex1;
        }
        if (pos.ndcX > point1.x && pos.ndcX < point2.x) {
            var k = (point2.y - point1.y) / (point2.x - point1.x);
            y = k * (pos.ndcX - point1.x) + point1.y;
        }
        return y;
    },
    checkInsideRectangle: function(pos, vertices) {
        // check bounds
        var inside = false;
        var minX = Math.min(vertices[0].x, vertices[1].x, vertices[2].x, vertices[3].x);
        var minY = Math.min(vertices[0].y, vertices[1].y, vertices[2].y, vertices[3].y);
        var maxX = Math.max(vertices[0].x, vertices[1].x, vertices[2].x, vertices[3].x);
        var maxY = Math.max(vertices[0].y, vertices[1].y, vertices[2].y, vertices[3].y);
        if (pos.ndcX > minX && pos.ndcX < maxX && pos.ndcY > minY && pos.ndcY < maxY) {
            var intersectsY = [];
            var y;
            var point1i,point2i;
            for (var i = 0; i < 4; i++) {
                point1i = i;
                if (i > 2) {
                    point2i = 0;
                } else {
                    point2i = point1i + 1;
                }
                y = this.intersectLine(pos, vertices[point1i], vertices[point2i]);
                if (y !== null) {
                    intersectsY.push(y);
                }
                if (i > 0 && intersectsY.length === 2) {
                    minY = Math.min(intersectsY[0], intersectsY[1]);
                    maxY = Math.max(intersectsY[0], intersectsY[1]);
                    if (pos.ndcY > minY && pos.ndcY < maxY) {
                        inside = true;
                    }
                    break;
                }
            }
        }
        return inside;
    },
    addSideVertexNdc: function(indices, i, verticesNdc, cameraMatrix) {
        var index = indices[i];
        if (typeof(verticesNdc[index]) === 'undefined') {
            verticesNdc[index] = cameraMatrix.multiplyVector(this.cubeVertices[index]);
        }
        return index;
    },
    /**
     * This function looks complicated.
     * It is used for picking to support rotating cube frames with a pointing device.
     * 
     * @function
     * 
     * @param {string} mousePos Holds cursor position
     */
    pick: function(mousePos) {
        var pickInfo = {hit: false};
        // calculate camera matrix
        var cameraMatrix = new Matrix();
        Matrix.multiplyTo(this.camera.pMatrix, this.camera.vMatrix, cameraMatrix);
        // calculate ndc coordinates
        var verticesNdc = {};
        verticesNdc[0] = cameraMatrix.multiplyVector(this.cubeVertices[0]);
        verticesNdc[3] = cameraMatrix.multiplyVector(this.cubeVertices[3]);
        verticesNdc[12] = cameraMatrix.multiplyVector(this.cubeVertices[12]);
        verticesNdc[15] = cameraMatrix.multiplyVector(this.cubeVertices[15]);
        verticesNdc[40] = cameraMatrix.multiplyVector(this.cubeVertices[40]);
        verticesNdc[43] = cameraMatrix.multiplyVector(this.cubeVertices[43]);
        verticesNdc[52] = cameraMatrix.multiplyVector(this.cubeVertices[52]);
        verticesNdc[55] = cameraMatrix.multiplyVector(this.cubeVertices[55]);

        var visibleSides = this.getVisibleSides(); 

        var side;
        var rectangleVertices = [];
        var insideSide = false;
        for (var i = 0; i < 6; i++) { // 6 sides
            side = visibleSides[i];
            rectangleVertices.length = 0;
            if (side.v > U.COS80) {
                switch (side.n) {
                    case 'N':
                        rectangleVertices.push(verticesNdc[12]);
                        rectangleVertices.push(verticesNdc[0]);
                        rectangleVertices.push(verticesNdc[3]);
                        rectangleVertices.push(verticesNdc[15]);
                        break;
                    case 'F':
                        rectangleVertices.push(verticesNdc[55]);
                        rectangleVertices.push(verticesNdc[43]);
                        rectangleVertices.push(verticesNdc[40]);
                        rectangleVertices.push(verticesNdc[52]);
                        break;
                    case 'L':
                        rectangleVertices.push(verticesNdc[52]);
                        rectangleVertices.push(verticesNdc[40]);
                        rectangleVertices.push(verticesNdc[0]);
                        rectangleVertices.push(verticesNdc[12]);
                        break;
                    case 'R':
                        rectangleVertices.push(verticesNdc[15]);
                        rectangleVertices.push(verticesNdc[3]);
                        rectangleVertices.push(verticesNdc[43]);
                        rectangleVertices.push(verticesNdc[55]);
                        break;
                    case 'B':
                        rectangleVertices.push(verticesNdc[52]);
                        rectangleVertices.push(verticesNdc[12]);
                        rectangleVertices.push(verticesNdc[15]);
                        rectangleVertices.push(verticesNdc[55]);
                        break;
                    case 'T':
                        rectangleVertices.push(verticesNdc[0]);
                        rectangleVertices.push(verticesNdc[40]);
                        rectangleVertices.push(verticesNdc[43]);
                        rectangleVertices.push(verticesNdc[3]);
                        break;
                }
                insideSide = this.checkInsideRectangle(mousePos, rectangleVertices);
                if (insideSide) {
                    // check which cell is clicked
                    var insideCell;
                    var indices = this.sideIndices[side.n]['indices'];
                    var cellsOrder = this.sideIndices[side.n]['cellsOrder'];

                    var index, cellNum;
                    var j = 0;
                    for (var i = 0; i < 9; i++) {
                        if (i < 3) {
                            j = i;
                        } else if (i < 6) {
                            j = i + 1;
                        } else {
                            j = i + 2;
                        }

                        rectangleVertices.length = 0;

                        index = this.addSideVertexNdc(indices, j, verticesNdc, cameraMatrix);
                        rectangleVertices.push(verticesNdc[index]);

                        index = this.addSideVertexNdc(indices, j + 1, verticesNdc, cameraMatrix);
                        rectangleVertices.push(verticesNdc[index]);

                        index = this.addSideVertexNdc(indices, j + 5, verticesNdc, cameraMatrix);
                        rectangleVertices.push(verticesNdc[index]);

                        index = this.addSideVertexNdc(indices, j + 4, verticesNdc, cameraMatrix);
                        rectangleVertices.push(verticesNdc[index]);

                        insideCell = this.checkInsideRectangle(mousePos, rectangleVertices);

                        if (insideCell) {
                            cellNum = cellsOrder[i];
                            pickInfo.hit = true;
                            pickInfo.ndcX = mousePos.ndcX;
                            pickInfo.ndcY = mousePos.ndcY;
                            pickInfo.pointerX = mousePos.x;
                            pickInfo.pointerY = mousePos.y;
                            
                            pickInfo.side = side.n;
                            pickInfo.cell = cellNum;
                            break;
                        }
                    }
                    break;
                }
            }
        }
        return pickInfo;
    },
    onMouseDown: function(e) {
        e.preventDefault();
        if (this.paused) {
            return;
        }
        if (e.button !== 0) {
            if (this.mouseDown) {
                this.camera.enabled = true;
                this.mouseDown = null;
            }
            return;
        }
        var mouseDown = this.pick(getMousePos(e, this.canvas));
        if (!mouseDown.hit) {
            this.mouseDown = null;
            return;
        }
        this.camera.enabled = false;
        this.mouseDown = mouseDown;
    },
    onMouseOut: function() {
        if (this.paused) {
            return;
        }
        this.resetMouse();
    },
    onMouseUp: function(e) {
        e.preventDefault();
        if (this.paused) {
            return;
        }
        this.resetMouse();
    },
    onMouseMove: function(e) {
        if (this.paused) {
            return;
        }
        if (!this.mouseDown) {
            return;
        }
        if (e.button !== 0) {
            return;
        }
        var cellStart = this.cells[this.mouseDown.cell];
        var mouseUp = null;
        if (cellStart.pos !== 3) {
            mouseUp = this.pick(getMousePos(e, this.canvas));
        }
        var frame = null;
        var dir = null;
        if (mouseUp && mouseUp.hit) {
            if (this.mouseDown.cell === mouseUp.cell) {
                return;
            }
            var mouseDX = this.mouseDown.pointerX - mouseUp.pointerX;
            var mouseDY = this.mouseDown.pointerY - mouseUp.pointerY;
            var mouseDist = Math.sqrt(mouseDX * mouseDX + mouseDY * mouseDY);
            
            if (mouseDist < this.mouseSensitivity) {
                return;
            }
            
            var startSide = this.mouseDown.side;
            var endSide = mouseUp.side;
            
            if (startSide === endSide) {
                var frameDir = null;
                switch (startSide) {
                    case 'F':
                        frameDir = this.getMouseRotationParams(this.mouseDown.cell, mouseUp.cell, 0, 1, 1, -1);
                        break;
                    case 'N':
                        frameDir = this.getMouseRotationParams(this.mouseDown.cell, mouseUp.cell, 0, 1, -1, 1);
                        break;
                    case 'R':
                        frameDir = this.getMouseRotationParams(this.mouseDown.cell, mouseUp.cell, 1, 2, 1, 1);
                        break;
                    case 'L':
                        frameDir = this.getMouseRotationParams(this.mouseDown.cell, mouseUp.cell, 1, 2, -1, -1);
                        break;
                    case 'T':
                        frameDir = this.getMouseRotationParams(this.mouseDown.cell, mouseUp.cell, 0, 2, -1, -1);
                        break;
                    case 'B':
                        frameDir = this.getMouseRotationParams(this.mouseDown.cell, mouseUp.cell, 0, 2, 1, 1);
                        break;
                }
                frame = frameDir[0];
                dir = frameDir[1];
            }
        }
        this.mouseDown = null;
        
        this.camera.enabled = true;
        if (frame && dir && frame !== 'X1' && frame !== 'Y1' && frame !== 'Z1') {
            this.rotateFrameStart(frame, dir > 0 ? '+' : '-');
        }
    },
    resetMouse: function() {
        if (this.mouseDown) {
            this.camera.enabled = true;
        }
        this.mouseDown = null;
    },
    getMouseRotationParams: function(cellStartNum, cellEndNum, frameInd1, frameInd2, sign1, sign2) {
        var frame = null;
        var dir = null;

        var cellStart = this.cells[cellStartNum];
        var cellEnd = this.cells[cellEndNum];

        var frameNumStart;
        var frameNumEnd;
        var frameStart1, frameEnd1;
        var frameStart2, frameEnd2;
        
        if (cellStartNum !== cellEndNum) {
            
            frameStart1 = cellStart.f[frameInd1];
            frameEnd1 = cellEnd.f[frameInd1];
            
            frameStart2 = cellStart.f[frameInd2];
            frameEnd2 = cellEnd.f[frameInd2];
            
            if (frameStart1 === frameEnd1) {
                frame = frameStart1;
                
                frameNumStart = cellStart.f[frameInd2].charAt(1);
                frameNumEnd = cellEnd.f[frameInd2].charAt(1);
                
                dir = frameNumEnd - frameNumStart;
                dir *= sign1;
            } else if (frameStart2 === frameEnd2) {
                frame = frameStart2;
                
                frameNumStart = cellStart.f[frameInd1].charAt(1);
                frameNumEnd = cellEnd.f[frameInd1].charAt(1);
                
                dir = frameNumEnd - frameNumStart;
                dir *= sign2;
            }
        }
        return [frame, dir];
    },
    initMouseControls: function() {
        var $this = this;
        
        this.initCubeVertices();
        
        var eventPrefix = 'mouse';
        
        this.canvas.addEventListener(eventPrefix + 'down', function(e) {
            $this.onMouseDown(e);
        }, false);
        this.canvas.addEventListener(eventPrefix + 'out', function(e) {
            $this.onMouseOut(e);
        }, false);
        this.canvas.addEventListener(eventPrefix + 'move', function(e) {
            $this.onMouseMove(e);
        }, false);
        this.canvas.addEventListener(eventPrefix + 'up', function(e) {
            $this.onMouseUp(e);
        }, false);
        
        this.camera.attachControl(this.canvas);
    },
     /*
     // This is for testing purposes and is not easy to use for users so I commented this out
    initKeyboardControls: function() {
        var $this = this;     
        document.addEventListener('keydown', function(e) {
            if ($this.paused) {
                return;
            }
            var dir, frame;
            switch(e.which) {
                //X
                case 90: //X0+
                    frame = 'X0'; dir = '+';
                    break;
                case 88: //X0-
                    frame = 'X0'; dir = '-';
                    break;
                case 67: //X2+
                    frame = 'X2'; dir = '+';
                    break;
                case 86: //X2-
                    frame = 'X2'; dir = '-';
                    break;
                //Y
                case 65: //Y0+
                    frame = 'Y0'; dir = '+';
                    break;
                case 83: //Y0-
                    frame = 'Y0'; dir = '-';
                    break;
                case 68: //Y2+
                    frame = 'Y2'; dir = '+';
                    break;
                case 70: //Y2-
                    frame = 'Y2'; dir = '-';
                    break;
                //Z
                case 81: //Z0+
                    frame = 'Z0'; dir = '+';
                    break;
                case 87: //Z0-
                    frame = 'Z0'; dir = '-';
                    break;
                case 69: //Z2+
                    frame = 'Z2'; dir = '+';
                    break;
                case 82: //Z2-
                    frame = 'Z2'; dir = '-';
                    break;
                default:
                    return;
            }
            $this.rotateFrameStart(frame, dir);
        }, false);
    },
    */
    initSides: function() {
        var side;
        for (var sideName in this.sides) {
            side = this.sides[sideName];
            switch (sideName) {
                case 'F':
                    side.rotation = new Vector(0, -Math.PI, 0);
                    side.position = new Vector(0, 0, -this.subCubeSizeHalf);
                    break;
                case 'N':
                    side.rotation = new Vector(0, 0, 0);
                    side.position = new Vector(0, 0, this.subCubeSizeHalf);
                    break;
                case 'R':
                    side.rotation = new Vector(0, U.PI_HALF, 0);
                    side.position = new Vector(this.subCubeSizeHalf, 0, 0);
                    break;
                case 'L':
                    side.rotation = new Vector(0, -U.PI_HALF, 0);
                    side.position = new Vector(-this.subCubeSizeHalf, 0, 0);
                    break;
                case 'T':
                    side.rotation = new Vector(-U.PI_HALF, 0, 0);
                    side.position = new Vector(0, this.subCubeSizeHalf, 0);
                    break;
                case 'B':
                    side.rotation = new Vector(U.PI_HALF, 0, 0);
                    side.position = new Vector(0, -this.subCubeSizeHalf, 0);
                    break;
            }
            side.material = new Material(sideName, side.color, side.texture, this.gl);
        }
        this.backSide.material = new Material('back', this.backSide.color, null, this.gl);
    },
    /**
     * Create a side mesh prototype which then used to create real objects
     * 
     * @function
     */
    createSideProto: function() {
        var vertices = [
            this.subCubeSizeHalf, this.subCubeSizeHalf, 0.0, // 0
            -this.subCubeSizeHalf, this.subCubeSizeHalf, 0.0, // 1
            -this.subCubeSizeHalf, -this.subCubeSizeHalf, 0.0, // 2
            this.subCubeSizeHalf, -this.subCubeSizeHalf, 0.0 // 3
        ];
        var indices = [
            0, 1, 2,
            0, 2, 3
        ];
        var normals = [
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0
        ];
        this.sideMeshProto = new Mesh(
            'proto',
            vertices,
            indices,
            normals,
            null
        );
        var textureCoords = [
            1.0, 1.0, 
            0.0, 1.0, 
            0.0, 0.0, 
            1.0, 0.0
        ];
        this.sideMeshProto.setTextureCoords(textureCoords);
    },
    /**
     * Create all meshes our cube consists of
     * 
     * @function
     */
    createCube: function() {
        this.createSideProto();
        for (var id = 0; id < 26; id++) { // 26
            this.createSubCube(id);
        }
        // sort side meshes by material
        this.meshes.sort(function(m1, m2) {
            if (m2.material.name == m1.material.name) {
                return 0;
            }
            return (m2.material.name > m1.material.name) ? 1 : -1;
        });
    },
    /**
     * Create small cubes
     * 
     * @function
     */
    createSubCube: function(id) {
        var cell = this.cells[id];
        var subCube = new SubCube('subCube_' + id, this);
        var sideMesh, side;
        for (var sideName in this.sides) {
            var isBackSide = true;
            side = this.sides[sideName];
            for (var i in cell.s) {
                if (cell.s[i] === sideName) {
                    isBackSide = false;
                    break;
                }
            }
            if (isBackSide) {
                sideMesh = this.createBackSideMesh(id, sideName, side);
            } else {
                sideMesh = this.createSideMesh(id, sideName, side);
            }
            subCube.addSide(sideMesh);
        }
        
        subCube.data = {
            cell: id,
            aim: id,
            ini: id,
            orientation: {'F': 'F', 'N': 'N', 'R': 'R', 'L': 'L', 'T': 'T', 'B': 'B'}
        };
        var frame = cell.f;
        subCube.setTranslate(this[frame[0]], this[frame[1]], this[frame[2]]);
        
        this.cubes.push(subCube);
        return subCube;
    },
    createBackSideMesh: function(id, sideName, sideFrom) {
        this.backSide.position = sideFrom.position;
        this.backSide.rotation = sideFrom.rotation;
        return this.createSideMesh(id, sideName, this.backSide);
    },
    createSideMesh: function(id, sideName, side) {
        if (!side.material.colors) {
            var color = new Vector(1, 1, 1);
            var colors = [];
            for (var i = 0; i < 4; i++) {
                colors.push(color.x, color.y, color.z);
            }
            side.material.setColors(colors);
        }
        
        var sideMesh = new Mesh(sideName + id, [], [], [], side.material);
        sideMesh.vertices = this.sideMeshProto.vertices;
        sideMesh.indices = this.sideMeshProto.indices;
        sideMesh.normals = this.sideMeshProto.normals;
        sideMesh.textureCoords = this.sideMeshProto.textureCoords;
        sideMesh.elementsCnt = this.sideMeshProto.elementsCnt;
        
        sideMesh.rotation = side.rotation.clone();
        sideMesh.position = side.position.clone();
        sideMesh.updateMatrices();
        sideMesh.data = {side: sideName};
        return sideMesh;
    },
    setPaused: function(isPaused) {
        this.paused = isPaused;
    },
    /**
     * Reset a game
     * 
     * @function
     */
    reset: function() {
        var $this = this;
        
        this.resetMouse();
        this.solved = false;
        this.setPaused(true);
        this.animating = false;
        this.currentSubCubes.length = 0;
        
        var cnt = this.cubes.length;
        for (var i = 0; i < cnt; i++) {
            var subCube = this.cubes[i];
            var aimCell = this.cells[subCube.data.aim];
            // reset data.orientation
            for (var sideName in subCube.data.orientation) {
                subCube.data.orientation[sideName] = sideName;
            }
            // reset current cell and subCube position
            subCube.data.cell = subCube.data.aim;
            subCube.rotation.x = subCube.rotation.y = subCube.rotation.z = 0;
            subCube.position.x = this[aimCell.f[0]];
            subCube.position.y = this[aimCell.f[1]];
            subCube.position.z = this[aimCell.f[2]];
            subCube.updateMatrices();
            
            // reset side meshes
            subCube.sideMeshes.forEach(function(sideMesh) {
                var side = $this.sides[sideMesh.data.side];
                sideMesh.rotation = side.rotation.clone();
                sideMesh.position = side.position.clone();
                sideMesh.updateMatrices();
            });
        }
        
        this.scramble();
        
        this.movesCnt = 0;
        this.updateHud();
        this.setPaused(false);
    },
    scramble: function() {
        this.scrambles.length = 0;
        // scramble
        var possibleMoves = [];
        possibleMoves.push(
            ['X0', '+'], ['X0', '-'],
            ['Y0', '+'], ['Y0', '-'],
            ['Z0', '+'], ['Z0', '-'],
            ['X2', '+'], ['X2', '-'],
            ['Y2', '+'], ['Y2', '-'],
            ['Z2', '+'], ['Z2', '-']
        );
        var possibleMovesLen = possibleMoves.length;
        var moveCnt = Math.floor(Math.random() * (this.scramblesMax - this.scramblesMin + 1)) + this.scramblesMin;
        var moveInd;
        var frame, dir;
        var lastFrame = null;
        var lastDir = null;
        var possibleMovesSlice;
        for (var i = 0; i < moveCnt; i++) {
            moveInd = Math.floor(Math.random() * possibleMovesLen);
            frame = possibleMoves[moveInd][0];
            dir = possibleMoves[moveInd][1];
            if (frame === lastFrame && dir !== lastDir) {
                possibleMovesSlice = possibleMoves.slice(0);
                switch (frame) {
                    case 'X0':
                        possibleMovesSlice.splice(0, 2);
                        break;
                    case 'Y0':
                        possibleMovesSlice.splice(2, 2);
                        break;
                    case 'Z0':
                        possibleMovesSlice.splice(4, 2);
                        break;
                    case 'X2':
                        possibleMovesSlice.splice(6, 2);
                        break;
                    case 'Y2':
                        possibleMovesSlice.splice(8, 2);
                        break;
                    case 'Z2':
                        possibleMovesSlice.splice(10, 2);
                        break;
                }
                moveInd = Math.floor(Math.random() * possibleMovesSlice.length);
                frame = possibleMovesSlice[moveInd][0];
                dir = possibleMovesSlice[moveInd][1];
            }
            this.scrambles.push([frame, dir]);
            lastFrame = frame;
            lastDir = dir;
        }
        
        // apply scramble
        this.mute = true;
        var scramblesLen = this.scrambles.length;
        for (var i = 0; i < scramblesLen; i++) {
            this.rotateFrameStart(this.scrambles[i][0], this.scrambles[i][1]);
            this.rotateFrameEnd();
        }
        
        if (this.checkComplete()) {
            this.scrambles.length = 0;
            this.scrambles.push(
                ['X0', '-'], ['Z2', '+'], ['Z2', '+'], ['Y0', '+'], ['Z2', '-'], ['Y0', '-'], ['Y0', '-'],
                ['Z2', '+'], ['Y2', '+'], ['Z0', '+'], ['Z0', '+'], ['Y2', '-'], ['Z0', '+'], ['Z0', '+'],
                ['Y0', '-'], ['Y0', '-'], ['Z0', '+'], ['Z0', '+'], ['X0', '+'], ['Z0', '+'], ['Z0', '+'],
                ['Y2', '+'], ['Z0', '-'], ['Y0', '-'], ['X2', '+'], ['Y2', '+'], ['Z0', '-'], ['Y2', '-'],
                ['Y2', '-'], ['Z0', '+'], ['Z2', '+'], ['Z2', '+'], ['X0', '-'], ['X0', '-'], ['Z0', '-']
            );
            scramblesLen = this.scrambles.length;
            for (var i = 0; i < scramblesLen; i++) {
                this.rotateFrameStart(this.scrambles[i][0], this.scrambles[i][1]);
                this.rotateFrameEnd();
            }
        }
        this.mute = false;
    },
    /**
     * Start rotation a frame. Direction is specified
     * 
     * @function
     */
    rotateFrameStart: function(frame, dir) {
        if (this.animating) {
            return false;
        }
        this.animating = true;
        this.currentFrame = frame;
        this.currentDir = dir;
        this.rotAngle = 0;
        
        var cnt = this.cubes.length;
        for (var i = 0; i < cnt; i++) {
            var subCube = this.cubes[i];
            var cell = this.cells[subCube.data.cell];
            if (cell.f.indexOf(frame) < 0) {
                continue;
            }
            this.currentSubCubes.push(subCube);
        }
        if (!this.mute) {
            this.playSound('rotate');
        }
    },
    /**
     * End rotation
     * 
     * @function
     */
    rotateFrameEnd: function() {
        var $this = this;
        var axis = this.currentFrame.charAt(0);
        var cellRuleKey = axis + this.currentDir;
        var sideRules = this.rules[axis].slice(0);
        if ('-' === this.currentDir) {
            sideRules.reverse();
        }

        this.currentSubCubes.forEach(function(subCube) {
            var cell = $this.cells[subCube.data.cell];
            var nextCellNum = cell.r[cellRuleKey];
            var nextCell = $this.cells[nextCellNum];
            
            subCube.data.cell = nextCellNum;
            subCube.rotation.x = subCube.rotation.y = subCube.rotation.z = 0;
            subCube.position.x = $this[nextCell.f[0]];
            subCube.position.y = $this[nextCell.f[1]];
            subCube.position.z = $this[nextCell.f[2]];
            
            subCube.updateMatrices();
            
            var from, to, sideMeshSide;
            var newOrientation = {};
            for (var i = 0; i < 4; i++) {
                from = sideRules[i];
                to = sideRules[i + 1];
                sideMeshSide = subCube.data.orientation[from];
                newOrientation[to] = sideMeshSide;
            }
            // new orientation
            for (var sideName in newOrientation) {
                subCube.data.orientation[sideName] = newOrientation[sideName];
            }
            // rearrange side meshes
            subCube.sideMeshes.forEach(function(sideMesh) {
                for (var sideName in newOrientation) {
                    if (sideMesh.data.side === newOrientation[sideName]) {
                        var side = $this.sides[sideName];
                        sideMesh.rotation = side.rotation.clone();
                        sideMesh.position = side.position.clone();
                        sideMesh.updateMatrices();
                    }
                }
            });
        });
        
        this.animating = false;
        this.currentFrame = null;
        this.currentDir = null;
        this.currentSubCubes.length = 0;
        this.rotAngle = 0;
        
        if (!this.paused) {
            this.movesCnt++;
            this.updateHud();
            if (this.checkComplete()) {
                this.solved = true;
            }
        }
    },
    /**
     * Check if cube is solved
     * 
     * @function
     */    
    checkComplete: function() {
        var isComplete = true;
        var cnt = this.cubes.length;
        for (var i = 0; i < cnt; i++) {
            var subCube = this.cubes[i];
            if (subCube.data.cell !== subCube.data.aim) {
                isComplete = false;
                break;
            }
        }
        return isComplete;
    },
    win: function() {
        this.setPaused(true);
        alert('You won!');
        this.reset();
    },
    rotatingFrame: function() {
        var $this = this;
        var axis = this.currentFrame.charAt(0);
        
        this.rotAngle += this.rotSpeed * this.animationRatio;
        if (this.rotAngle >= 90) {
            this.rotateFrameEnd();
            return;
        }
        
        this.currentSubCubes.forEach(function(subCube) {
            var cell = $this.cells[subCube.data.cell];
            var rad = (cell.pos === 1 ? $this.rotRadius1 : $this.rotRadius2);
            var angle = cell.rot[axis];
            var locAngle = $this.rotAngle;
            if ('-' === $this.currentDir) {
                angle -= locAngle;
                locAngle *= -1;
            } else {
                angle += locAngle;
            }
            angle *= U.PI_180;
            locAngle *= U.PI_180;
            switch (axis) {
                case 'X':
                    if (cell.pos !== 3) {
                        subCube.position.y = rad * Math.sin(angle);
                        subCube.position.z = -rad * Math.cos(angle);
                    }
                    subCube.rotation.x = locAngle;
                    break;
                case 'Y':
                    if (cell.pos !== 3) {
                        subCube.position.z = -rad * Math.sin(angle);
                        subCube.position.x = rad * Math.cos(angle);
                    }
                    subCube.rotation.y = locAngle;
                    break;
                case 'Z':
                    if (cell.pos !== 3) {
                        subCube.position.y = rad * Math.sin(angle);
                        subCube.position.x = rad * Math.cos(angle);
                    }
                    subCube.rotation.z = locAngle;
                    break;
            }
            // apply new position and rotation
            subCube.updateMatrices();
        });
    },
    run: function() {
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clearDepth(1.0);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LEQUAL);
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true); //for texture
        
        var t0 = 0;
        this.renderLoop(t0, t0);
    }
};
var getMousePos = function(e, canvas) {
    var x, y;
    var canvasRect = canvas.getBoundingClientRect();
    x = e.clientX - canvasRect.left;
    y = e.clientY - canvasRect.top;
    var ndcX = (x / canvasRect.width) * 2 - 1;
    var ndcY = -(y / canvasRect.height) * 2 + 1;
    return {x: x, y: y, ndcX: ndcX, ndcY: ndcY};
};
window.addEventListener('DOMContentLoaded', function() {
    new GlitchCube('gameCanvas');
});
})();
