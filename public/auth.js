var socket = io('/auth');

var input = document.createElement('input');
input.type = 'password';
input.placeholder = 'password';

var button = document.createElement('input');
button.type = 'button';

var div = document.createElement('div');
div.appendChild(input);
div.appendChild(button);
div.id = "authDiv";

socket.on('setup', (id)=>{
    button.value = "set pass";
    document.body.appendChild(div);

    button.addEventListener("click", ()=>{
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "./setup", true);
        xhr.setRequestHeader('Content-type', 'application/json');
        
        xhr.onreadystatechange = () => {
            if(xhr.readyState == 4 && xhr.status == 200) {
                location.reload();
            }
        }

        let data = {
            'user': id,
            'pass': window.btoa(input.value)
        };

        xhr.send(JSON.stringify(data));
    });
});

socket.on('auth', (id)=>{
    button.value = "login"
    document.body.appendChild(div);

    button.addEventListener("click", ()=>{
        let xhr = new XMLHttpRequest();
        xhr.open("POST", "./auth", true, id);
        xhr.setRequestHeader('Content-type', 'application/json');
        
        xhr.onreadystatechange = () => {
            if(xhr.readyState == 4 && xhr.status == 200) {
                sessionStorage.setItem('id', id);
                sessionStorage.setItem('token', xhr.responseText);
                location.replace("./stream");
            }
        }

        let data = {
            'user': id,
            'pass': window.btoa(input.value)
        };

        xhr.send(JSON.stringify(data));
    });
});