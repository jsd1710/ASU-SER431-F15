"use strict";
var scene, camera, renderer, controls;
var mesh;
var originalMesh;
var subdivisions = 0;

var TOOLBAR_HEIGHT = 100;
var WIDTH = window.innerWidth,
	  HEIGHT = window.innerHeight - TOOLBAR_HEIGHT;

var WARNINGS = ! true; // Set to true for development
var ABC = ['a', 'b', 'c'];

init();

addToDOM();

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
        var material = new THREE.MeshLambertMaterial({ color: 0xFF69B4, wireframe: true });
        mesh = new THREE.Mesh(geometry, material);
        originalMesh = mesh.clone();
        scene.add( mesh );

        animate();
    } );
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
}

function animate()
{
    requestAnimationFrame(animate);

    renderer.render(scene, camera);

    //mesh.rotation.y += 0.1;
    //mesh.rotation.x += 0.1;

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

function subdivide(mesh)
{
    scene.remove( mesh );
    let geometry = originalMesh.geometry.clone();

    var repeats = subdivisions;
    while (repeats-- > 0)
    {
        var tmp = new THREE.Vector3();

        var oldVertices, oldFaces;
        var newVertices, newFaces;

        var n;
        var metaVertices, sourceEdges;

        // new stuff.
        var sourceEdges, newEdgeVertices, newSourceVertices;

        oldVertices = geometry.vertices;
        oldFaces = geometry.faces;

        /******************************************************
		 *
		 * Step 0: Preprocess Geometry to Generate edges Lookup
		 *
		 *******************************************************/

        metaVertices = new Array(oldVertices.length);
        sourceEdges = {};

        generateLookups(oldVertices, oldFaces, metaVertices, sourceEdges);


        /******************************************************
		 *
		 *	Step 1. 
		 *	For each edge, create a new Edge Vertex,
		 *	then position it.
		 *
		 *******************************************************/

        newEdgeVertices = [];
        var other, currentEdge, newEdge, face;
        var edgeVertexWeight, adjacentVertexWeight, connectedFaces;

        for (let i in sourceEdges)
        {

            currentEdge = sourceEdges[i];
            newEdge = new THREE.Vector3();

            edgeVertexWeight = 3 / 8;
            adjacentVertexWeight = 1 / 8;

            connectedFaces = currentEdge.faces.length;

            // check how many linked faces. 2 should be correct.
            if (connectedFaces != 2)
            {

                // if length is not 2, handle condition
                edgeVertexWeight = 0.5;
                adjacentVertexWeight = 0;
            }

            newEdge.addVectors(currentEdge.a, currentEdge.b).multiplyScalar(edgeVertexWeight);

            tmp.set(0, 0, 0);

            for (let j = 0; j < connectedFaces; j++)
            {

                face = currentEdge.faces[j];

                for (let k = 0; k < 3; k++)
                {

                    other = oldVertices[face[ABC[k]]];
                    if (other !== currentEdge.a && other !== currentEdge.b) break;

                }

                tmp.add(other);

            }

            tmp.multiplyScalar(adjacentVertexWeight);
            newEdge.add(tmp);

            currentEdge.newEdge = newEdgeVertices.length;
            newEdgeVertices.push(newEdge);
        }

        /******************************************************
		 *
		 *	Step 2. 
		 *	Reposition each source vertices.
		 *
		 *******************************************************/

        var beta, sourceVertexWeight, connectingVertexWeight;
        var connectingEdge, connectingEdges, oldVertex, newSourceVertex;
        newSourceVertices = [];

        for (let i = 0; i < oldVertices.length; i++)
        {

            oldVertex = oldVertices[i];

            // find all connecting edges (using lookupTable)
            connectingEdges = metaVertices[i].edges;
            n = connectingEdges.length;
            beta = 1 / n * ( 5/8 - Math.pow( 3/8 + 1/4 * Math.cos( 2 * Math. PI / n ), 2) );

            sourceVertexWeight = 1 - n * beta;
            connectingVertexWeight = beta;

            if (n <= 2)
            {

                // crease and boundary rules
                if (n == 2)
                {
                    sourceVertexWeight = 3 / 4;
                    connectingVertexWeight = 1 / 8;
                } 
            }

            newSourceVertex = oldVertex.clone().multiplyScalar(sourceVertexWeight);

            tmp.set(0, 0, 0);

            for (let j = 0; j < n; j++)
            {

                connectingEdge = connectingEdges[j];
                other = connectingEdge.a !== oldVertex ? connectingEdge.a : connectingEdge.b;
                tmp.add(other);

            }

            tmp.multiplyScalar(connectingVertexWeight);
            newSourceVertex.add(tmp);

            newSourceVertices.push(newSourceVertex);

        }


        /******************************************************
		 *
		 *	Step 3. 
		 *	Generate Faces between source vertecies
		 *	and edge vertices.
		 *
		 *******************************************************/

        newVertices = newSourceVertices.concat(newEdgeVertices);
        var sl = newSourceVertices.length, edge1, edge2, edge3;
        newFaces = [];

        for (let i = 0; i < oldFaces.length; i++)
        {

            face = oldFaces[i];

            // find the 3 new edges vertex of each old face

            edge1 = getEdge(face.a, face.b, sourceEdges).newEdge + sl;
            edge2 = getEdge(face.b, face.c, sourceEdges).newEdge + sl;
            edge3 = getEdge(face.c, face.a, sourceEdges).newEdge + sl;

            // create 4 faces.

            newFace(newFaces, edge1, edge2, edge3);
            newFace(newFaces, face.a, edge1, edge3);
            newFace(newFaces, face.b, edge2, edge1);
            newFace(newFaces, face.c, edge3, edge2);

        }

        // Overwrite old arrays
        geometry.vertices = newVertices;
        geometry.faces = newFaces;
    }

    mesh.geometry = geometry;
    scene.add( mesh );
}

function getSubdivisions()
{
    return subdivisions;
}

function updateSubdivisionCounter()
{
    document.getElementById( "subCount" ).innerHTML = getSubdivisions();
}

function decrementSubdivisions()
{
    if (subdivisions > 0)
    {
        subdivisions--;
        updateSubdivisionCounter();
        subdivide(mesh);
    }
    
    
}
function incrementSubdivisions()
{
    if (subdivisions < 5)
    {
        subdivisions++;
        updateSubdivisionCounter();
        subdivide(mesh);
    }
        
}

function generateLookups(vertices, faces, metaVertices, edges)
{
    var face, edge;

    for (let i = 0; i < vertices.length; i++)
    {

        metaVertices[i] = { edges: [] };

    }

    for (let i = 0; i < faces.length; i++)
    {

        face = faces[i];

        processEdge(face.a, face.b, vertices, edges, face, metaVertices);
        processEdge(face.b, face.c, vertices, edges, face, metaVertices);
        processEdge(face.c, face.a, vertices, edges, face, metaVertices);

    }

}

function newFace(newFaces, a, b, c)
{
    newFaces.push(new THREE.Face3(a, b, c));
}

function processEdge(a, b, vertices, map, face, metaVertices)
{

    var vertexIndexA = Math.min(a, b);
    var vertexIndexB = Math.max(a, b);

    var key = vertexIndexA + "_" + vertexIndexB;

    var edge;

    if (key in map)
    {

        edge = map[key];

    }
    else
    {

        var vertexA = vertices[vertexIndexA];
        var vertexB = vertices[vertexIndexB];

        edge = {

            a: vertexA, // pointer reference
            b: vertexB,
            newEdge: null,
            faces: [] // pointers to face

        };

        map[key] = edge;

    }

    edge.faces.push(face);

    metaVertices[a].edges.push(edge);
    metaVertices[b].edges.push(edge);
}

function getEdge(a, b, map)
{
    var vertexIndexA = Math.min(a, b);
    var vertexIndexB = Math.max(a, b);

    var key = vertexIndexA + "_" + vertexIndexB;

    return map[key];
}