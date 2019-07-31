

var express = require('express');
var router = express.Router();
const sqlite = require('sqlite3').verbose();
var models = require('../models');
const auth = require('../config/auth');


// GET signup page
router.get('/signup', function(req, res, next) {
  res.render('signup')
});


// POST signup
router.post('/signup', function(req, res, next) {
  const hashedPassword = auth.hashPassword(req.body.password);
  models.users.findOne({
    where: {
      Username: req.body.username
    }
  }).then(user => {
    if (user) {
      res.send('this user already exists')
    } else {
      models.users.create({
        FirstName: req.body.firstName,
        LastName: req.body.lastName,
        Email: req.body.email,
        Username: req.body.username,
        Password: hashedPassword
      })
      .then(createdUser => {
        const isMatch = createdUser.comparePassword(req.body.password);
        if (isMatch) {
          const userId = createdUser.UserId;
          console.log(userId);
          const token = auth.signUser(createdUser);
          res.cookie('jwt', token);
          res.redirect('profile/' + userId)
        } else {
          console.error('not a match');
        }
      });
    }
  });
});


// GET login page
router.get('/login', function(req, res, next) {
  res.render('login');
});


// POST login
router.post('/login', function(req, res, next) {
  const hashedPassword = auth.hashPassword(req.body.password);
  models.users.findOne({
    where: {
      Username: req.body.username
    }
  }).then(user => {
    const isMatch = user.comparePassword(req.body.password);
    if (!user) {
      return res.status(401).json({
        message: "Login Failed"
      });
    }
    if (isMatch) {
      const userId = user.UserId;
      const token = auth.signUser(user);
      res.cookie('jwt', token);
      res.redirect('profile/' + userId)
    } else {
      console.log(req.body.password);
      res.redirect('login')
    }
  });
});

// GET profile by Id
  router.get('/profile/:id', auth.verifyUser, function(req, res, next) {
    if (req.params.id !== String(req.user.UserId)) {
      res.send('This is not your profile')
    } else {
      let status;
      if (req.user.Admin) {
        status = 'Admin';
        res.render('users');
      } else {
        status = "Peasant";
      models.posts
        .findAll({
          where: {
            Deleted: null,
            UserId: req.user.UserId
          },
          include: [models.users]
        })
        .then(post => {
          res.render('profile', {
            UserId: req.user.UserId,
            FirstName: req.user.FirstName,
            LastName: req.user.LastName,
            Username: req.user.Username,
            Status: status,
            posts: post
          });
        });
      };
    };
  });


// POST createPost
router.post('/profile/:id', auth.verifyUser, function(req, res) {
  let userId = parseInt(req.params.id);
    models.posts
    .findOrCreate({
      where: {
        UserId: req.body.UserId,
        PostTitle: req.body.postTitle,
        PostBody: req.body.postBody
      }
    })
    .spread(function(result, created) {
      if (created) {
        res.redirect('/users/profile/' + userId);
      } else {
        res.send('This post already exists');
      }
  });
});


// GET editPost
router.get('/posts/:id', auth.verifyUser, function(req, res, next) {
  let postId = parseInt(req.params.id);
  models.posts
  .find({
    where: {
      PostId: postId
    }
  })
  .then(post => {
    res.render('editPost', {
      UserId: post.UserId,
      PostTitle: post.PostTitle,
      PostBody: post.PostBody,
      PostId: post.PostId
    });
  });
});


// PUT editPost
router.put('/posts/:id', auth.verifyUser, (req, res) => {
  let postId = parseInt(req.params.id);
  models.posts
  .update(
    {
      PostTitle: req.body.postTitle,
      PostBody: req.body.postBody
    },
    {
      where: {
        PostId: postId
      }
    }
  )
  .then(result => 
    res.redirect('/users/profile/' + userId))
    .catch(err => {
      res.status(400);
      res.send('There was a problem updating the Post')
    });
});


// DELETE editPost
router.delete('/posts/:id/delete', (req, res, next) => {
  let deletedPostId = parseInt(req.params.id);
  models.posts
  .update( 
    {
      Deleted: 'true'
    },
    {
      where: {
        PostId: deletedPostId
      }
    }
  )
  .then(post => {
    res.send();
  });
});


// GET logout
router.get('/logout', function(req, res) {
  res.cookie('jwt', null);
  res.redirect('/users/login');
});


// GET list of users, admin command
router.get('/admin', auth.verifyUser, function(req, res, next) {
  let userId = parseInt(req.params.id);
  if (req.user.Admin === true) {
    models.users
    .findAll({
      where: {
        Deleted: false
      },
      UserId: userId
    })
    .then(usersFound => {
      res.render('users', {
        users: usersFound
      });
    });
  } else {
    res.send('You are a Peasant. No Admin commands for you!');
  }
});


// GET editUser
router.get('/editUser/:id', auth.verifyUser, (req, res) => {
  if (req.user.Admin === true) {
    let userId = parseInt(req.params.id);
    models.users
    .find({
      where: {
        UserId: userId,
        Deleted: false
      }
    })
    .then(posts => {
      models.posts
      .findAll({
        where: {
          UserId: userId,
          Deleted: false
        }
      })
    .then(editUser => {
      res.render('editUser', {
        UserId: post.UserId,
        FirstName: posts.FirstName,
        LastName: posts.LastName,
        Username: posts.Username,
        PostId: posts.PostId,
        posts: editUser
      });
    });
  });
  } else {
    res.send('You are a Peasant. No Admin commands for you!');
  };
});

// DELETE user, admin command
router.delete('/editUser/:id/delete', (req, res) => {
  let deletedUserId = parseInt(req.params.id);
  models.users
  .update (
    {
      Deleted: 'true'
    },
    {
      where: {
        UserId: deletedUserId
      }
    }
  )
  .then(post => {
    models.posts
      .update(
        {
          Deleted: 'true'
        },
        {
          where: {
            UserId: userId
          }
        }
      )
      .then(user => {
      res.redirect('admin');
    });
  });
});


module.exports = router;


{{#each users}}
<a href="/users/editUser/{{UserId}}">
    <h3>{{FirstName}} {{LastName}}</h3>
    <br>
</a>
{{/each}}