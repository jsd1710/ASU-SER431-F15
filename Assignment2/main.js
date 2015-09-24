var scene, camera, renderer;
var mesh;

var TOOLBAR_HEIGHT = 100;
var WIDTH = window.innerWidth,
	  HEIGHT = window.innerHeight - TOOLBAR_HEIGHT;

init();
addToDOM();
animate();

function init()
{
    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(WIDTH, HEIGHT);
    document.body.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(45, WIDTH / HEIGHT, 0.1, 20000);
    camera.position.set(0, 0, 6);
    scene.add(camera);

    window.addEventListener('resize', function ()
    {
        var WIDTH = window.innerWidth,
            HEIGHT = window.innerHeight - TOOLBAR_HEIGHT;
        renderer.setSize(WIDTH, HEIGHT);
        camera.aspect = WIDTH / HEIGHT;
        camera.updateProjectionMatrix();
    });

    // Set the background color of the scene.
    renderer.setClearColor(0x333F47, 1);

    var light = new THREE.PointLight(0xffffff);
    light.position.set(-100, 200, 100);
    scene.add(light);

    var loader = new THREE.JSONLoader();
    loader.load("models/monkey.json", function (geometry)
    {
        var material = new THREE.MeshLambertMaterial({ color: 0xFF69B4 });
        mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
    });

    controls = new THREE.OrbitControls(camera, renderer.domElement);
}

function animate()
{
    requestAnimationFrame(animate);

    renderer.render(scene, camera);

    /*
    if (mesh)
    {
      mesh.rotation.y += 0.1;
      mesh.rotation.x += 0.1;
    }
    */

    controls.update();
}

function addToDOM()
{
    var container = document.getElementById('container');
    var canvas = container.getElementsByTagName('canvas');
    if (canvas.length > 0)
    {
        container.removeChild(canvas[0]);
    }
    container.appendChild(renderer.domElement);
}