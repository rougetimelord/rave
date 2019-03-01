var socket = io('/backend');

//Sets up password field
var input = document.createElement('input');
input.type = 'password';
input.placeholder = 'password';

//Sets up the button to submit the password
var button = document.createElement('input');
button.type = 'button';

//Set up div for auth input
var authDiv = document.createElement('div');
authDiv.appendChild(input);
authDiv.appendChild(button);
authDiv.id = 'authDiv';

/* Handles password setup
*/
socket.on('setup', ()=>{
    button.value = 'set pass';
    document.body.appendChild(authDiv);

    button.addEventListener('click', ()=>{
        socket.emit('setup', window.btoa(input.value));
        location.reload();
    });
});

/* Handles password
*/
socket.on('auth', ()=>{
    button.value = 'login'
    document.body.appendChild(authDiv);

    button.addEventListener('click', ()=>{
        socket.emit('auth', window.btoa(input.value), (data) => {
            if(data){
                document.getElementById('streamControls').classList.remove('hidden');
                authDiv.classList.add('hidden');
                document.getElementById('stream-addr').value = data['stream-addr'];
                document.getElementById('stream-key').value = data['stream-key'];
            } else {
                alert('wrong password, don\'t be a 1337 haxor pls');
            }
        })
    });
});

var streamOn = 0;

/**
 * Handles errors.
 * 
 * @param {*} err 
 */
var errHandler = (err) => {
    console.log('error: ' + err);
}

socket.on('stats', (data) => {
    document.getElementById('listeners').innerText = data;
});

document.addEventListener('DOMContentLoaded', () => {
    let removeStyle = document.getElementsByClassName('hidden');
    for(let i = 0; i < removeStyle.length; i++) {
        removeStyle[i].removeAttribute('style');
    }
});