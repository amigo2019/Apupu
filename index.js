const express = require('express')
var cors = require('cors')
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require("socket.io");

const path = require('path');
var session = require('express-session')
const app = express()
const port = 3000

const server = http.createServer(app);
const io = new Server(server);
app.use(express.json()); // converter os dados enviado no request
app.use(express.static('public'))
app.set('trust proxy', 1) // trust first proxy
app.set('view engine', 'ejs');

app.use(session({
  secret: 'apupu',
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }
}))

app.get('/', function(req, res) {
  if(req.session.username){
    res.render(path.join(__dirname, '/public/index'), {username:req.session.username,_id: req.session._id});
 } else {
    res.render(path.join(__dirname, '/public/index'), {username:null,_id: null});
 }
});

app.get('/sair', function(req, res) {
  req.session.destroy((err) => {
    res.redirect('/') // will always fire after session is destroyed
  })
});


var url = "mongodb://localhost:27017/apupu";

mongoose.connect(url)
  .then(() => console.log('DB Connected!')).catch(() => {
    console.log("DB Connection failed!");
  });

const UserSchema = mongoose.Schema(
    {
        username: {
        type: String,
        required: true,
        index: {
          unique: true
        }
        },

        password: {
        type: String,
        required: true,
        },
    }
);
const Usuarios = mongoose.model("usuarios", UserSchema);

const MbajisSchema = mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
      index: {
        unique: true
      }
      },
    imagem: {
    type: String,
    required: true,
    },
    descricao: {
      type: String,
      required: true,
    },
    playlist: {
      type: Array,
      required: true,
    },
  }
);
const Mbajis = mongoose.model("mbajis", MbajisSchema);

app.get('/createMBAJIs', function(req, res) {
  if(req.session.username){
    res.render(path.join(__dirname, '/public/creatembaji'), {username:req.session.username,_id: req.session._id});
 } else {
    res.render(path.join(__dirname, '/public/creatembaji'), {username:null,_id: null});
 }
});
app.post('/createMBAJIs', async (req, res) => {
  try {
    await Mbajis.create(req.body);
    res.send({'mensagem':'Mbaji inserido na base de dados'})
  } catch (error) {
    console.log(error)
    res.send({'mensagem':'erro'})
  }
})


app.get('/register', function(req, res) {
  res.render(path.join(__dirname, '/public/register'));
});
app.post('/register', async (req, res) => {
  try {
    await Usuarios.create(req.body);
    res.send({'mensagem':'Usuario inserido na base de dados'})
  } catch (error) {
    res.send({'mensagem':'erro'})
  }
})

app.get('/login', function(req, res) {
  res.render(path.join(__dirname, '/public/login'));
});
app.post('/login', function(req, res) {
  Usuarios.findOne({username: req.body.username,password: req.body.password})
   .then((docs)=>{
    if (docs == null){
      res.send({'mensagem':'sem dados' ,"dados": null})
    }else{
      req.session._id = docs._id;
      req.session.username = docs.username;
      req.session.save();
      res.send({'mensagem':'dados encontrado' ,"dados": docs})
    }  
   })
   .catch((err)=>{
       console.log(err);
});
});

app.get('/mbajis', function(req, res) {
  if ("search" in req.query){
    const regex = new RegExp(req.query.search, 'i')
    Mbajis.find({$or:[ {playlist: {$elemMatch:{$or:[ {titulo:{$regex: regex}},{artistas:{$regex: regex}}]}}}, { nome: {$regex: regex}}, {descricao: {$regex: regex}}]})
   .then((lista_de_mbajis)=>{
    if(req.session.username){
      res.render(path.join(__dirname, '/public/mbajis'), {username:req.session.username,_id: req.session._id,lista_de_mbajis:lista_de_mbajis});
   } else {
      res.render(path.join(__dirname, '/public/mbajis'), {username:null,_id: null,lista_de_mbajis:lista_de_mbajis});
   }
   })
   .catch((err)=>{
       console.log(err);
});

  } else {
    lista_de_mbajis = []

    if(req.session.username){
      res.render(path.join(__dirname, '/public/mbajis'), {username:req.session.username,_id: req.session._id,lista_de_mbajis:lista_de_mbajis});
   } else {
      res.render(path.join(__dirname, '/public/mbajis'), {username:null,_id: null,lista_de_mbajis:lista_de_mbajis});
   }
  }

});


app.get('/chat/:chatid', function(req, res) {
  if(req.session.username){
  Mbajis.findOne({_id: req.params.chatid})
   .then((doc)=>{
      res.render(path.join(__dirname, '/public/chatroom'), {username:req.session.username,_id: req.session._id, chatinfo: doc});
    })
    .catch((err)=>{
        console.log(err);
  });
 }
});

app.post('/adicionar_musica_playlist', async function(req, res) {
  try {
    await Mbajis.findByIdAndUpdate(req.body.chatid, {
        $push: {
            playlist: req.body.data,
        },
    });
    res.send({'mensagem':'musica salva na playlist'})
  } catch (error) {
    res.send({'mensagem':'erro'})
  }
});

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

io.on('connection', (socket) => {
  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
  });

  socket.on('mudar musica', (msg) => {
    io.emit('mudar musica', msg);
  });
});


server.listen(port, () => {
  console.log(`app listening on port ${port}`)
})