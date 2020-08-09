var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const expressLayouts = require('express-ejs-layouts')
const passport = require('passport');
const path = require('path');
const fs = require('fs');
var flash = require('connect-flash');
var cookieParser = require('cookie-parser')
const PORT = process.env.PORT || 4000;
let error = { error: null };
var bcrypt = require('bcrypt');
var multer = require('multer');
// var MongoClient = require('mongodb').MongoClient
const mongoose = require('mongoose');
const Patient = require('./models/Patient')
const Doctor = require('./models/Doctor')
const Admin = require('./models/Admin')
const User = require('./models/User')
const Chat = require('./models/Chat')
const Post = require('./models/Post')
const Appointment = require('./models/Appointment')
const Notification = require('./models/Notification')
const Message = require('./models/Message')
const Report = require('./models/Report')
var imgModel = require('./models/Image');
const MONGODB_URI = 'mongodb+srv://kman1:angtolabader@mongocluster-issat.mongodb.net/test?retryWrites=true&w=majority';
// || 'mongodb://localhost:27017/chat_db'


mongoose.connect(MONGODB_URI, {
   useNewUrlParser: true,
   useUnifiedTopology: true,
   useCreateIndex: true,
   useFindAndModify: false,
   family: 4 // Use IPv4, skip trying IPv6
});
const { ensureAuthenticated, forwardAuthenticated } = require('./config/auth');


// Express body parser
app.use(express.urlencoded({ extended: false }));
// Body parser for json (used for fetch)
app.use(express.json());

//Multer

var storage = multer.diskStorage({
   destination: (req, file, cb) => {
      cb(null, 'uploads')
   },
   filename: (req, file, cb) => {
      cb(null, file.fieldname + '-' + Date.now())
   }
});

var upload = multer({ storage: storage });

// Passport Config
require('./config/passport')(passport);


// init sessions for passport
var session = require("express-session");
const { json } = require('express');
const e = require('express');
app.use(session({ secret: "cats" }));


// init serialization fns for passport 
passport.serializeUser(function (user, done) {
   done(null, user);
});
passport.deserializeUser(function (user, done) {
   done(null, user);
});


// Passport middleware
app.use(passport.initialize());
app.use(passport.session());


/// EJS
app.use(expressLayouts);
app.set('view engine', 'ejs');

//Connect flash middleware
app.use(cookieParser('secretString'));
app.use(session({ cookie: { maxAge: 60000 } }));
app.use(flash());

//Routes

//(GET) Main Page Route
app.get('/', forwardAuthenticated, function (req, res) {
   res.render('welcome');
});

//Register & Login Routes
//(GET) Patient Register & Login
app.get('/patient/register', forwardAuthenticated, function (req, res) {
   res.render('register/register-patient', error);
});

app.get('/patient/login', forwardAuthenticated, function (req, res) {
   res.render('login/login-patient', { error: req.flash('error') });
});

//(GET) Doctor Register & Login
app.get('/doctor/register', forwardAuthenticated, function (req, res) {
   res.render('register/register-doctor', error);
});

app.get('/doctor/login', forwardAuthenticated, function (req, res) {
   res.render('login/login-doctor', { error: req.flash('error') });
});

//(GET) Admin Login
app.get('/admin/login', forwardAuthenticated, function (req, res) {
   res.render('login/login-admin', { error: req.flash('error') });
});

// Login POST requests
//(POST) Patient Logins to system
app.post('/patient/login', (req, res, next) => {
   passport.authenticate('local', {
      successRedirect: '/dashboard',
      failureRedirect: '/patient/login',
      failureFlash: true
   })(req, res, next);
});

//(POST) Doctor Logins to system
app.post('/doctor/login', (req, res, next) => {
   passport.authenticate('local', {
      successRedirect: '/dashboard',
      failureRedirect: '/doctor/login',
      failureFlash: true
   })(req, res, next);
});

//(POST) Admin Logins to system
app.post('/admin/login', (req, res, next) => {
   passport.authenticate('local', {
      successRedirect: '/dashboard',
      failureRedirect: '/admin/login',
      failureFlash: true
   })(req, res, next);
});

//ROUTES THAT MULTIPLE USER TYPES CAN VISIT

//Dashboard route
//Check requesting user type and render the correct .ejs file

app.get('/dashboard', ensureAuthenticated, function (req, res) {

   if (req.user.type === 'admin') {
      res.render('dashboard/admin/home', {
         layout: 'dashboard/admin/layout',
         username: req.user.name,
         email: req.user.email,
         id: req.user._id
      });

      //Admin dashboard routes
      //GET Requests and renders
   }
   if (req.user.type === 'doctor') {

      res.render('dashboard/doctor/home', {
         layout: 'dashboard/doctor/layout',
         username: req.user.name,
         email: req.user.email,
         id: req.user._id
      });

   }
   if (req.user.type === 'patient') {

      res.render('dashboard/patient/home', {
         layout: 'dashboard/patient/layout',
         username: req.user.name,
         email: req.user.email,
         id: req.user._id
      });
   }
});

//PERSONAL-DETAILS (USERS PROFILE ROUTES)
//RETRIEVE IMAGE
// https://www.geeksforgeeks.org/upload-and-retrieve-image-on-mongodb-using-mongoose/
app.get('/dashboard/personal-details', ensureAuthenticated, (req, res) => {

   if (req.user.type === 'doctor') {
      imgModel.find({ id: req.user._id }, (err, items) => {
         if (err) {
            console.log(err);
         }
         else if (items) {
            res.render('dashboard/doctor/personal-details', {
               layout: 'dashboard/doctor/layout',
               username: req.user.name,
               email: req.user.email,
               id: req.user._id,
               items: items
            });
         }
         else {
            res.render('dashboard/doctor/personal-details', {
               layout: 'dashboard/doctor/layout',
               username: req.user.name,
               email: req.user.email,
               id: req.user._id
            });
         }
      });
   } else if (req.user.type === 'patient') {

      res.render('dashboard/patient/personal-details', {
         layout: 'dashboard/patient/layout',
         username: req.user.name,
         surname: req.user.surname,
         telephone: req.user.telephone,
         gender: req.user.gender,
         dd: req.user.dd,
         mm: req.user.mm,
         yy: req.user.yy,
         post_code: req.user.post_code,
         email: req.user.email,
         id: req.user._id
      });

   } else {
      res.render('notFound');
   }
})

//My appointments page: Appointments
app.get('/dashboard/my-appointments', ensureAuthenticated, (req, res) => {

   if (req.user.type === 'doctor') {
      res.render('dashboard/doctor/my-appointments/appointments', {
         layout: 'dashboard/doctor/layout',
         username: req.user.name,
         surname: req.user.surname,
         email: req.user.email,
         id: req.user._id
      })
   } else if (req.user.type === 'patient') {
      res.render('dashboard/patient/my-appointments/appointments', {
         layout: 'dashboard/patient/layout',
         username: req.user.name,
         surname: req.user.surname,
         email: req.user.email,
         id: req.user._id
      });
   }
})

//My appointments page: Requests
app.get('/dashboard/my-appointments/requests', ensureAuthenticated, (req, res) => {

   if (req.user.type === 'doctor') {
      res.render('dashboard/doctor/my-appointments/requests', {
         layout: 'dashboard/doctor/layout',
         username: req.user.name,
         surname: req.user.surname,
         email: req.user.email,
         id: req.user._id
      })
   } else if (req.user.type === 'patient') {
      res.render('dashboard/patient/my-appointments/requests', {
         layout: 'dashboard/patient/layout',
         username: req.user.name,
         surname: req.user.surname,
         email: req.user.email,
         id: req.user._id
      });
   }
})

//My appointments page: History/Completed
app.get('/dashboard/my-appointments/history', ensureAuthenticated, (req, res) => {

   if (req.user.type === 'doctor') {
      res.render('dashboard/doctor/my-appointments/completed', {
         layout: 'dashboard/doctor/layout',
         username: req.user.name,
         surname: req.user.surname,
         email: req.user.email,
         id: req.user._id
      })
   } else if (req.user.type === 'patient') {
      res.render('dashboard/patient/my-appointments/completed', {
         layout: 'dashboard/patient/layout',
         username: req.user.name,
         surname: req.user.surname,
         email: req.user.email,
         id: req.user._id
      });
   }
})

//My appointments page: Rejected/Cancelled
app.get('/dashboard/my-appointments/cancelled', ensureAuthenticated, (req, res) => {

   if (req.user.type === 'doctor') {
      res.render('dashboard/doctor/my-appointments/cancelled', {
         layout: 'dashboard/doctor/layout',
         username: req.user.name,
         surname: req.user.surname,
         email: req.user.email,
         id: req.user._id
      })
   } else if (req.user.type === 'patient') {
      res.render('dashboard/patient/my-appointments/cancelled', {
         layout: 'dashboard/patient/layout',
         username: req.user.name,
         surname: req.user.surname,
         email: req.user.email,
         id: req.user._id
      });
   }
})

app.post('/appointment/action/d', ensureAuthenticated, (req, res) => {
   if (req.body.action === 'reject') {
      Appointment.findOneAndUpdate({
         _id: req.body.appointment_id
      }, { $set: { type: 'rejected' } }, function (err, appointment) {
         if (err) {
            res.json({
               result: 'fail',
               msg: err
            });
         } else {
            res.json({
               result: 'success',
               msg: 'Request has been rejected'
            });
         }

      });

      const notification = new Notification({
         status: 'unseen',
         content: `Dr.${req.body.doctor.surname} ${req.body.doctor.name} has rejected the appointment request on ${req.body.timestamp}`,
         user_id: req.body.patient.id,
         href: '/dashboard/my-appointments/cancelled'
      }).save().then(notification => {
         true
      })
   } else if (req.body.action === 'accept') {
      Appointment.findOneAndUpdate({
         _id: req.body.appointment_id
      }, { $set: { type: 'appointment' } }, function (err, appointment) {
         if (err) {
            res.json({
               result: 'fail',
               msg: err
            });
         } else {
            res.json({
               result: 'success',
               msg: 'Request has been accepted'
            });
         }
      });

      const notification = new Notification({
         status: 'unseen',
         content: `Dr. ${req.body.doctor.surname} ${req.body.doctor.name} has accepted your request for an appointment on ${req.body.timestamp}`,
         user_id: req.body.patient.id,
         href: '/dashboard/my-appointments'
      }).save().then(notification => {
         true
      })
   } else if (req.body.action === 'cancel') {
      Appointment.findOneAndUpdate({
         _id: req.body.appointment_id
      }, { $set: { type: 'cancelled' } }, function (err, appointment) {
         if (err) {
            res.json({
               result: 'fail',
               msg: err
            });
         } else {
            res.json({
               result: 'success',
               msg: 'Appointment has been cancelled'
            });
         }
      });

      const notification = new Notification({
         status: 'unseen',
         content: `Dr. ${req.body.doctor.surname} ${req.body.doctor.name} has cancelled the appointment on ${req.body.timestamp}<br> The reason is: ${req.body.reason}`,
         user_id: req.body.patient.id,
         href: '/dashboard/my-appointments/cancelled'
      }).save().then(notification => {
         true
      })
   }
})

app.post('/appointment/action/p', ensureAuthenticated, (req, res) => {
   req.body
   if (req.body.action === 'cancel req' || req.body.action === 'cancel app') {
      Appointment.findOneAndUpdate({
         _id: req.body.appointment_id
      }, { $set: { type: 'cancelled' } }, function (err, appointment) {
         if (err) {
            res.json({
               result: 'fail',
               msg: err
            });
         } else {
            res.json({
               result: 'success',
               msg: 'Request has been cancelled successfully'
            });
         }
      });

      if (req.body.action === 'cancel req') {
         const notification = new Notification({
            status: 'unseen',
            content: `${req.body.patient.name} ${req.body.patient.surname} has cancelled his request for an appointment on ${req.body.timestamp}`,
            user_id: req.body.doctor.id,
            href: '/dashboard/my-appointments/cancelled'
         }).save().then(notification => {
            true
         })
      } else if (req.body.action === 'cancel app') {
         const notification = new Notification({
            status: 'unseen',
            content: `${req.body.patient.name} ${req.body.patient.surname}has cancelled the appointment you had, on ${req.body.timestamp}`,
            user_id: req.body.doctor.id,
            href: '/dashboard/my-appointments/cancelled'
         }).save().then(notification => {
            true
         })
      }

   }
})

//Notifications page

app.get('/dashboard/notifications', ensureAuthenticated, (req, res) => {
   if (req.user.type === 'doctor') {
      res.render('dashboard/doctor/notifications', {
         layout: 'dashboard/doctor/layout',
         email: req.user.email,
         username: req.user.name,
         id: req.user._id
      })
   } else if (req.user.type === 'patient') {
      res.render('dashboard/patient/notifications', {
         layout: 'dashboard/patient/layout',
         email: req.user.email,
         username: req.user.name,
         id: req.user._id
      })
   }

   app.post('/getNotifications', ensureAuthenticated, (req, res) => {
      Notification.find({ user_id: req.body.id }, function (err, notifications) {
         if (err) {
            res.json(err);
         }
         if (notifications) {
            res.json(notifications);
            notifications.forEach(notification => {
               notification.status = 'seen'
               notification.save()
            })
         }
      });
   })
})

/////////////////////////////////////
////////////ADMIN ROUTES/////////////
/////////////////////////////////////

////////////////GET/////////////////

//Admin Posts Selection (New Post, Edit Post, See Posts)

//New post
app.get('/dashboard/posts/new-post', ensureAuthenticated, function (req, res) {
   if (req.user.type === 'admin') {
      res.render('dashboard/admin/posts/new-post', {
         layout: 'dashboard/admin/layout',
         email: req.user.email,
         username: req.user.name,
         id: req.user._id
      });
   } else {
      res.render('notFound')
   }
})

//Edit post
app.get('/dashboard/posts/edit-post', ensureAuthenticated, function (req, res) {
   if (req.user.type === 'admin') {
      res.render('dashboard/admin/posts/edit-post', {
         layout: 'dashboard/admin/layout',
         username: req.user.name,
         email: req.user.email,
         id: req.user._id,
         message: null
      });
   } else {
      res.render('notFound')
   }
})

//See posts
app.get('/dashboard/posts/see-posts', ensureAuthenticated, function (req, res) {
   if (req.user.type === 'admin') {
      res.render('dashboard/admin/posts/see-posts', {
         layout: 'dashboard/admin/layout',
         username: req.user.name,
         email: req.user.email,
         id: req.user._id,
         message: null
      });
   } else {
      res.render('notFound')
   }
})

//Manage Doctors
app.get('/dashboard/users-management/doctors', ensureAuthenticated, function (req, res) {
   if (req.user.type === 'admin') {
      res.render('dashboard/admin/users-management/doctors', {
         layout: 'dashboard/admin/layout',
         username: req.user.name,
         email: req.user.email,
         id: req.user._id
      });
   } else {
      res.render('notFound')
   }
})

//Manage Patients
app.get('/dashboard/users-management/patients', ensureAuthenticated, function (req, res) {
   if (req.user.type === 'admin') {
      res.render('dashboard/admin/users-management/patients', {
         layout: 'dashboard/admin/layout',
         username: req.user.name,
         email: req.user.email,
         id: req.user._id
      });
   } else {
      res.render('notFound')
   }
})

//Manage Patients
app.get('/dashboard/users-management/admins', ensureAuthenticated, function (req, res) {
   if (req.user.type === 'admin') {
      res.render('dashboard/admin/users-management/admins', {
         layout: 'dashboard/admin/layout',
         username: req.user.name,
         email: req.user.email,
         id: req.user._id,
         error: null,
         error2: null,
         msg: null,
         msg2: null
      });
   } else {
      res.render('notFound')
   }
})

//Manage Reports
app.get('/dashboard/reports', ensureAuthenticated, function (req, res) {
   if (req.user.type === 'admin') {
      res.render('dashboard/admin/reports', {
         layout: 'dashboard/admin/layout'
      });
   } else {
      res.render('notFound')
   }
})

//Contact platform
app.get('/dashboard/contact-platform', ensureAuthenticated, function (req, res) {
   if (req.user.type === 'admin') {
      res.render('dashboard/admin/contact-platform', {
         layout: 'dashboard/admin/layout'
      });
   } else {
      res.render('notFound')
   }
})

//Email notifications
app.get('/dashboard/email-notifications', ensureAuthenticated, function (req, res) {
   if (req.user.type === 'admin') {
      res.render('dashboard/admin/email-notifications', {
         layout: 'dashboard/admin/layout'
      });
   } else {
      res.render('notFound')
   }
})

////////////////POST/////////////////
// Admin POST Requests

//Post new post from admin
app.post('/dashboard/posts/new-post', ensureAuthenticated, function (req, res) {
   if (req.user.type === 'admin') {
      const newPost = new Post({
         title: req.body.postTitle,
         content: req.body.postContent,
         author: req.body.postAuthor
      }).save().then(newPost => {
         true
      })
      res.render('dashboard/admin/posts/new-post', {
         layout: 'dashboard/admin/layout',
         email: req.user.email,
         username: req.user.name,
         id: req.user._id
      });
   }
});

//Edit an existing post (admin) 
app.post('/dashboard/posts/edit-post', ensureAuthenticated, function (req, res) {
   if (req.user.type === 'admin') {
      Post.findOneAndUpdate(
         { _id: req.body.id },
         { $set: { title: req.body.postTitle, content: req.body.postContent, author: req.body.postAuthor } },
         (err, doc) => {
            if (err) {
               // console.log("Something wrong when updating data!");
               if (req.user.type === 'admin') {
                  res.render('dashboard/admin/posts/edit-post', {
                     layout: 'dashboard/admin/layout',
                     email: req.user.email,
                     username: req.user.name,
                     id: req.user._id,
                     message: 'Something wrong when updating data!'
                  });
               }
            }
            else {
               if (req.user.type === 'admin') {
                  res.render('dashboard/admin/posts/edit-post', {
                     layout: 'dashboard/admin/layout',
                     email: req.user.email,
                     username: req.user.name,
                     id: req.user._id,
                     message: 'Post edit successful'
                  });
               }
            }
         })
   }
});

//Delete existing post (admin)
app.post('/dashboard/posts/see-posts', ensureAuthenticated, function (req, res) {
   if (req.user.type === 'admin') {
      Post.findOneAndRemove(
         { _id: req.body.id },
         (err, doc) => {
            if (err) {
               // console.log("Something wrong when deleting data!");
               if (req.user.type === 'admin') {
                  res.render('dashboard/admin/posts/see-posts', {
                     layout: 'dashboard/admin/layout',
                     email: req.user.email,
                     username: req.user.name,
                     id: req.user._id,
                     message: 'Something wrong when deleting data!'
                  });
               }
            }
            else {
               if (req.user.type === 'admin') {
                  res.render('dashboard/admin/posts/see-posts', {
                     layout: 'dashboard/admin/layout',
                     email: req.user.email,
                     username: req.user.name,
                     id: req.user._id,
                     message: 'Post removed'
                  });
               }
            }
         })
   }
});

//Users management

//Route for getting Doctors or Users or Admins (for admin's user management)
app.post('/getUsers/admin', ensureAuthenticated, (req, res) => {
   if (req.user.type === 'admin') {
      if (req.body.usertype === 'doctor') {
         User.find({ type: req.body.usertype }, function (err, user) {
            if (err) {
               res.send(err);
            }
            res.json(user);
         });
      }
      if (req.body.usertype === 'patient') {
         User.find({ type: req.body.usertype }, function (err, user) {
            if (err) {
               res.send(err);
            }
            res.json(user);
         });
      }
      if (req.body.usertype === 'admin') {
         User.find({ type: req.body.usertype }, function (err, user) {
            if (err) {
               res.send(err);
            }
            res.json(user);
         });
      }
   }
})

//Authorize doctor
app.post('/authDoc', ensureAuthenticated, (req, res) => {
   if (req.user.type === 'admin') {
      User.findOneAndUpdate(
         { _id: req.body.id },
         { $set: { authorized: true } },
         (err, doc) => {
            if (err) {
               res.json(err)
            }
            else {
               res.json(doc)
            }
         })
   }
});

//Delete user and his profile photo
app.post('/delUser', ensureAuthenticated, (req, res) => {
   if (req.user.type === 'admin') {
      User.findOneAndRemove(
         { _id: req.body.id },
         (err, user) => {
            if (err) {
               res.json(err)
            }
            else {
               if (user.type === 'doctor') {
                  res.json({
                     msg: 'Doctor removed from system',
                     url: '/dashboard/users-management/doctors'
                  })
               } else if (user.type === 'patient') {
                  res.json({
                     msg: 'Patient removed from system',
                     url: '/dashboard/users-management/patients'
                  })
               } else if (user.type === 'admin') {
                  res.json({
                     msg: 'Admin removed from system',
                     url: '/dashboard/users-management/admins'
                  })
               }
            }
         })

      imgModel.findOneAndRemove(
         { id: req.body.id },
         (err, doc) => {
            if (err) {
               res.json(err)
            }
         })
   }
});

//Change password of an admin OR delete an admin OR add an admin
app.post('/dashboard/users-management/admins', ensureAuthenticated, function (req, res) {
   if (req.user.type === 'admin') {
      if (req.body.new_password) {
         User.findOne({
            _id: req.body.id
         }).then((admin) => {
            if (admin && req.body.new_password == req.body.c_password) {
               bcrypt.genSalt(10, (err, salt) => {
                  bcrypt.hash(req.body.new_password, salt, (err, hash) => {
                     if (err) throw err;
                     admin.password = hash;
                     admin
                        .save()
                        .then(admin => {
                           res.render('dashboard/admin/users-management/admins', {
                              layout: 'dashboard/admin/layout',
                              username: req.user.name,
                              email: req.user.email,
                              id: req.user._id,
                              error: null,
                              msg: null,
                              msg2: 'Your password has been changed successfully',
                              error2: null
                           });
                           // res.json({ success: true, message: 'Your password has been changed successfully' });
                        })
                        .catch(err => console.log(err));
                  });
               });
            }
            else if (req.body.new_password !== req.body.c_password) {
               res.render('dashboard/admin/users-management/admins', {
                  layout: 'dashboard/admin/layout',
                  username: req.user.name,
                  email: req.user.email,
                  id: req.user._id,
                  error: null,
                  msg: null,
                  msg2: null,
                  error2: 'Passwords do not match'
               });
            }
            else {
               res.render('dashboard/admin/users-management/admins', {
                  layout: 'dashboard/admin/layout',
                  username: req.user.name,
                  email: req.user.email,
                  id: req.user._id,
                  error: null,
                  msg: null,
                  msg2: 'User not found',
                  error2: null
               });
               // res.json({ success: false, message: 'User not found' });
            }
         })
      }
      else {
         User.findOne({
            email: req.body.email,
            type: 'admin'
         }).then((admin) => {
            if (admin) {
               res.render('dashboard/admin/users-management/admins', {
                  layout: 'dashboard/admin/layout',
                  username: req.user.name,
                  email: req.user.email,
                  id: req.user._id,
                  error: 'Email in use',
                  msg: null,
                  error2: null,
                  msg2: null
               });
            } else {
               const newAdmin = new User({
                  name: req.body.name,
                  surname: req.body.surname,
                  email: req.body.email,
                  password: req.body.password,
                  type: 'admin',
                  authorized: true
               });

               bcrypt.genSalt(10, (err, salt) => {
                  bcrypt.hash(newAdmin.password, salt, (err, hash) => {
                     if (err) throw err;
                     newAdmin.password = hash;
                     newAdmin
                        .save()
                        .then(admin => {
                           // console.log(`1 admin inserted ${newAdmin}`);
                           res.render('dashboard/admin/users-management/admins', {
                              layout: 'dashboard/admin/layout',
                              username: req.user.name,
                              email: req.user.email,
                              id: req.user._id,
                              msg: 'Admin added',
                              error: null,
                              error2: null,
                              msg2: null
                           });
                        })
                        .catch(err => console.log(err));
                  });
               });
            }
         });
      }
   }
})


//Get patient's info for his profile (patient_profile page)
app.post('/getUsers/patient/a', ensureAuthenticated, (req, res) => {
   if (req.body.usertype === 'patient') {
      User.findOne({
         _id: req.body.id
      }, function (err, user) {
         if (err) {
            res.send(err);
         }
         console.log(user)
         res.json(user);
      });
   }
})

/////////////////////////////////////
///////////DOCTOR ROUTES/////////////
/////////////////////////////////////

//DOCTOR DASHBOARD ROUTES

//GET Requests and renders

app.get('/d/delete', ensureAuthenticated, (req, res) => {
   if (req.user.type === 'doctor') {
      res.render('dashboard/doctor/delete', {
         layout: 'dashboard/doctor/layout',
         username: req.user.name,
         email: req.user.email,
         id: req.user._id,
         msg: null
      })
   } else {
      res.render('notFound')
   }
})


// Uploading the image 
app.post('/dashboard/personal-details/image', ensureAuthenticated, upload.single('image'), (req, res, next) => {
   imgModel.findOne({ id: req.body.id }, function (err, image) {
      if (err) {
         res.send(err);
      }
      else {

         if (image) {
            image.remove();
         }

         var obj = {
            id: req.body.id,
            img: {
               data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
               contentType: 'image/png'
            }
         }
         imgModel.create(obj, (err, item) => {
            if (err) {
               console.log(err);
            }
            else {
               // item.save(); 
               res.redirect('/dashboard/personal-details');
            }
         });
      }

   });
});

//Update doctor's profile info
app.post('/dashboard/personal-details/info/d', ensureAuthenticated, (req, res) => {
   //Update telephone
   if (req.body.telephone) {
      User.findOneAndUpdate(
         { _id: req.body.id },
         {
            $set: {
               telephone: req.body.telephone
            }
         },
         (err, doc) => {
            if (err) {
               console.log(err)
            }
            else {
               res.json({ url: '/dashboard/personal-details' });
            }
         })
   }
   //Update website
   else if (req.body.website) {
      User.findOneAndUpdate(
         { _id: req.body.id },
         {
            $set: {
               website: req.body.website
            }
         },
         (err, doc) => {
            if (err) {
               console.log(err)
            }
            else {
               res.json({ url: '/dashboard/personal-details' });
            }
         })
   }
   //Update description
   else if (req.body.description) {
      User.findOneAndUpdate(
         { _id: req.body.id },
         {
            $set: {
               description: req.body.description
            }
         },
         (err, doc) => {
            if (err) {
               console.log(err)
            }
            else {
               res.json({ url: '/dashboard/personal-details' });
            }
         })
   }
   //Update specialization
   else if (req.body.specialization) {
      User.findOneAndUpdate(
         { _id: req.body.id },
         {
            $set: {
               specialization: req.body.specialization
            }
         },
         (err, doc) => {
            if (err) {
               console.log(err)
            }
            else {
               res.json({ url: '/dashboard/personal-details' });
            }
         })
   }
   //Update cv
   else if (req.body.cv) {
      User.findOneAndUpdate(
         { _id: req.body.id },
         {
            $set: {
               cv: req.body.cv
            }
         },
         (err, doc) => {
            if (err) {
               console.log(err)
            }
            else {
               res.json({ url: '/dashboard/personal-details' });
            }
         })
   }
   //Update languages
   else if (req.body.languages) {
      User.findOneAndUpdate(
         { _id: req.body.id },
         {
            $set: {
               languages: req.body.languages
            }
         },
         (err, doc) => {
            if (err) {
               console.log(err)
            }
            else {
               res.json({ url: '/dashboard/personal-details' });
            }
         })
   }
   //Update schedule
   else if (req.body.schedule) {

      User.findOne({ _id: req.body.id }, function (err, user) {
         if (user) {
            user.schedule = req.body.schedule
            user.save(function (err, user) {
               if (err) throw err;
               res.json({
                  url: '/dashboard/personal-details'
               })
            });
         } else {
            console.log(err);
         }
      });
   }
})

//Gets the doctor's info in order to set the profile
app.post('/getUsers/Doctors/1', ensureAuthenticated, (req, res) => {
   if (req.body.type === 'profile') {
      User.findOne({ _id: req.body.id }, function (err, user) {
         if (err) {
            res.send(err);
         }
         res.json(JSON.stringify(user));
      });
   }
})

//Delete doctor account 
app.post('/d/delete', ensureAuthenticated, (req, res, next) => {
   if (req.user.type === 'doctor') {

      User.findOne({
         _id: req.user._id
      }).then((user) => {
         if (user) {
            if (req.body.password === req.body.c_password) {
               bcrypt.compare(req.body.password, user.password, (err, isMatch) => {
                  if (err) throw err;
                  if (isMatch) {
                     user.remove();
                     return res.redirect('/logout');
                  } else {
                     return res.render('dashboard/doctor/delete', {
                        layout: 'dashboard/doctor/layout',
                        username: req.user.name,
                        email: req.user.email,
                        id: req.user._id,
                        msg: 'Password incorrect!'
                     });
                  }
               });
            }
         }
      })
   }
})

//Edit patient password (post)
app.post('/dashboard/personal-details/password/d', ensureAuthenticated, (req, res) => {
   if (req.body.password === req.body.c_password && req.body.password !== '') {
      User.findOne({
         _id: req.body.id
      }, function (err, user) {
         if (err) {
            console.log(err)
         }
         bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(req.body.password, salt, (err, hash) => {
               if (err) throw err;
               user.password = hash;
               user
                  .save()
                  .then(user => {
                     res.json({
                        msg: 'Your password has been changed successfully'
                     });
                  })
                  .catch(err => console.log(err));
            });
         });
      })
   }
})

//Get doctor's appointments
app.post('/getAppointments/d', ensureAuthenticated, (req, res) => {

   Appointment.find({
      'doctor.id': req.body.doctor_id,
      type: req.body.type
   }, function (err, appointments) {
      if (err) {
         res.json({
            result: 'fail',
            msg: err
         });
      } else {
         if (appointments.length === 0) {
            res.json({
               msg: 'There are no appointments at this moment',
               result: 'fail'
            })
         } else if (appointments.length > 0) {
            res.json({
               appointments: appointments,
               result: 'success'
            })
         }
      }

   });
})

/////////////////////////////////////
//////PATIENT DASHBOARD ROUTES///////
/////////////////////////////////////

//Route for getting users (patient dashboard)
app.post('/getUsers/patient/', ensureAuthenticated, (req, res) => {
   //Get Doctors (for patient's home page searchbar)
   if (req.body.usertype === 'doctor') {
      User.find({ type: req.body.usertype }, function (err, user) {
         if (err) {
            res.send(err);
         }
         res.json(user);
      });
   }
   //Get patient's info for his profile (personal details page)
   if (req.body.usertype === 'patient') {
      User.findOne({
         _id: req.body.id
      }, function (err, user) {
         if (err) {
            res.send(err);
         }

         res.json(user);
      });
   }
})

//Patient delete account page
app.get('/p/delete', ensureAuthenticated, (req, res) => {
   if (req.user.type === 'patient') {
      res.render('dashboard/patient/delete', {
         layout: 'dashboard/patient/layout',
         username: req.user.name,
         email: req.user.email,
         id: req.user._id,
         msg: null
      })
   } else {
      res.render('notFound')
   }
})

//Post requests

//Edit patient profile (post)
app.post('/dashboard/personal-details/info/p', ensureAuthenticated, (req, res) => {
   User.findOneAndUpdate(
      { _id: req.body.id },
      {
         $set: {
            name: req.body.name,
            surname: req.body.surname,
            telephone: req.body.telephone,
            gender: req.body.gender,
            dd: req.body.dd,
            mm: req.body.mm,
            yy: req.body.yy,
            post_code: req.body.post_code
         }
      },
      (err, info) => {
         if (err) {
            res.json({
               msg: 'There was an error while updating your info',
               type: 'fail'
            })
         }
         else {
            res.json({
               msg: 'Information updated',
               type: 'success',
               name: req.body.name,
               surname: req.body.surname,
               telephone: req.body.telephone,
               gender: req.body.gender,
               dd: req.body.dd,
               mm: req.body.mm,
               yy: req.body.yy,
               post_code: req.body.post_code
            });
         }
      })
})

//Edit patient password (post)
app.post('/dashboard/personal-details/password/p', ensureAuthenticated, (req, res) => {
   if (req.body.password === req.body.c_password && req.body.password !== '') {
      User.findOne({
         _id: req.body.id
      }, function (err, user) {
         if (err) {
            console.log(err)
         }
         bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(req.body.password, salt, (err, hash) => {
               if (err) throw err;
               user.password = hash;
               user
                  .save()
                  .then(user => {
                     res.json({
                        msg: 'Your password has been changed successfully'
                     });
                  })
                  .catch(err => console.log(err));
            });
         });
      })
   }
})

//Delete patient account 
app.post('/p/delete', ensureAuthenticated, (req, res, next) => {
   if (req.user.type === 'patient') {

      User.findOne({
         _id: req.user._id
      }).then((user) => {
         if (user) {
            if (req.body.password === req.body.c_password) {
               bcrypt.compare(req.body.password, user.password, (err, isMatch) => {
                  if (err) throw err;
                  if (isMatch) {
                     user.remove();
                     return res.redirect('/logout');
                  } else {
                     return res.render('dashboard/patient/delete', {
                        layout: 'dashboard/patient/layout',
                        username: req.user.name,
                        email: req.user.email,
                        id: req.user._id,
                        msg: 'Password incorrect!'
                     });
                  }
               });
            }
         }
      })
   }
})

//Send appointment request
app.post('/appointment/request', ensureAuthenticated, (req, res) => {
   Appointment.findOne({
      type: 'request',
      doctor: req.body.doctor,
      patient: req.body.patient
   }, function (err, appointment) {
      if (err) {
         res.json({
            result: 'fail',
            msg: err
         });
      }
      if (appointment) {
         res.json({
            result: 'fail',
            msg: "You have already made an appointment request to this doctor that hasn't been examined yet."
         })
      } else if (!appointment) {
         const newAppointment = new Appointment({
            doctor: req.body.doctor,
            patient: req.body.patient,
            type: 'request',
            timestamp: req.body.timestamp
         });

         const notification = new Notification({
            status: 'unseen',
            content: `${req.body.patient.name} ${req.body.patient.surname} has requested an appointment, on ${req.body.timestamp}`,
            user_id: req.body.doctor.id,
            href: '/dashboard/my-appointments/requests'
         }).save().then(notification => {
            true
         })

         newAppointment.save().then((appointment) => {
            res.json({
               result: 'success',
               msg: "Your appointment request has been sent. You will be informed about the doctor's response as soon as he examines and answers the request."
            })
         })
      }
   });
})

//Get patient's appointments
app.post('/getAppointments/p', ensureAuthenticated, (req, res) => {
   Appointment.find({
      'patient.id': req.body.patient_id
   }, function (err, appointments) {
      if (err) {
         res.json({
            result: 'fail',
            msg: err
         });
      } else {
         if (appointments.length === 0) {
            res.json({
               msg: 'There are no appointments at this moment',
               result: 'fail'
            })
         } else if (appointments.length > 0) {
            res.json({
               appointments: appointments,
               result: 'success'
            })
         }
      }
   });
})

////////////////////////////
//Register POST REQUESTS////
//(POST) Register Patient///
////////////////////////////
app.post('/patient/register', function (req, res) {

   User.findOne({
      email: req.body.email,
      type: 'patient'
   }).then((user) => {
      if (user) {
         res.render('register/register-patient', { error: 'User email already exists! Try another one.' });
      } else {
         const newPatient = new User({
            name: req.body.name,
            surname: req.body.surname,
            email: req.body.email,
            password: req.body.password,
            gender: req.body.gender,
            dd: req.body.dd,
            mm: req.body.mm,
            yy: req.body.yy,
            post_code: req.body.post_code,
            type: 'patient',
            authorized: true
         });

         bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(newPatient.password, salt, (err, hash) => {
               if (err) throw err;
               newPatient.password = hash;
               newPatient
                  .save()
                  .then(patient => {
                     // console.log(`1 patient inserted ${newPatient}`);
                     res.redirect('/patient/login');
                  })
                  .catch(err => console.log(err));
            });
         });
      }
   });
});

//(POST) Register Doctor
app.post('/doctor/register', function (req, res) {
   User.findOne({
      email: req.body.email,
      type: 'doctor'
   }).then((doctor) => {
      if (doctor) {
         res.render('register/register-doctor', { error: 'User email already exists! Try another one.' });
      } else {
         const newDoctor = new User({
            name: req.body.name,
            surname: req.body.surname,
            email: req.body.email,
            telephone: req.body.telephone,
            str_num: req.body.str_num,
            location: req.body.location,
            password: req.body.password,
            specialty: req.body.specialty,
            type: 'doctor',
            authorized: false
         });

         bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(newDoctor.password, salt, (err, hash) => {
               if (err) throw err;
               newDoctor.password = hash;
               newDoctor
                  .save()
                  .then(doctor => {
                     // console.log(`1 doctor inserted ${newDoctor}`);
                     res.redirect('/doctor/login');
                  })
                  .catch(err => console.log(err));
            });
         });
      }
   });
});

// FETCH Routes
//Route for post request, that gets user info
app.post('/info', function (req, res) {

   User.findOne({ '_id': req.body.id })
      .then(userProfile => {
         // console.log(patientProfile);
         res.end(JSON.stringify(userProfile));
      })
})

//Route for getting Doctors (for main home page searchbar)
app.post('/getUsers/main', (req, res) => {
   if (req.body.usertype === 'doctor') {
      User.find({ type: req.body.usertype }, function (err, user) {
         if (err) {
            res.send(err);
         }
         res.json(user);
      });
   }
})

//Route for getting main page posts
app.post('/getposts', (req, res) => {
   if (req.body.post_num >= 0) {
      Post.find().sort({ 'timestamp': -1 }).limit(req.body.post_num).exec(function (err, posts) {
         if (err) {
            console.log(err)
         }
         res.end(JSON.stringify(posts));
      })
   }
   if (req.body.post_num === 'all') {
      Post.find().sort({ 'timestamp': -1 }).exec(function (err, posts) {
         if (err) {
            console.log(err)
         }
         res.end(JSON.stringify(posts));
      })
   }
})

//Route for getting total number of unseen notifications (for doctor and patient navbar)
app.post('/getNotifications/unseen/number', (req, res) => {
   Notification.find({
      user_id: req.body.id,
      status: 'unseen'
   }).exec(function (err, notifications) {
      if (err) {
         console.log(err)
      }
      res.json({
         notifications: notifications
      });
   })
}
)


// Logout
app.get('/logout', (req, res) => {
   req.logout();
   res.redirect('/')
});

//Socket.io

let done, clients = 0



//PUBLIC FOLDER(css and js)
app.use(express.static(path.join(__dirname, '/public')));



let prof_id, specialtyArr, specialty, items = [], usersArr
// universal route. Always must be last route!!!
// set the users' profile dynamic route and the 404s
app.get('*', function (req, res) {

   // :hostname/profiles/id
   if (req.originalUrl.split(/[/]/)[1] === 'profiles') {
      // console.log(req.protocol + '://' + req.get('host') + req.originalUrl)
      prof_id = req.originalUrl.split(/[/]/)[2];
      User.findOne({ _id: prof_id }, function (err, user) {
         if (err) {
            res.render('notFound');
         } else if (user) {
            imgModel.find({ id: prof_id }, (err, items) => {
               if (err) {
                  res.send(err)
               } else if (user.type !== 'doctor') {

                  if (req.user.type === 'admin') {
                     res.render('dashboard/admin/patient_profile', {
                        layout: 'dashboard/admin/layout',
                        name: req.user.name,
                        surname: req.user.surname,
                        email: req.user.email,
                        id: req.user._id,
                        prof_id: prof_id,
                     })
                  } else {
                     res.render('notFound')
                  }
               }
               else if (items) {
                  if (req.user) {
                     if (req.user.type === 'patient') {
                        res.render('dashboard/patient/doctor_profile', {
                           layout: 'dashboard/patient/layout',
                           name: req.user.name,
                           surname: req.user.surname,
                           email: req.user.email,
                           id: req.user._id,
                           prof_id: prof_id,
                           items: items
                        });
                     } else if (req.user.type === 'doctor') {
                        res.render('dashboard/doctor/doctor_profile', {
                           layout: 'dashboard/doctor/layout',
                           username: req.user.name,
                           email: req.user.email,
                           id: req.user._id,
                           prof_id: prof_id,
                           items: items
                        });
                     } else if (req.user.type === 'admin') {
                        res.render('dashboard/admin/doctor_profile', {
                           layout: 'dashboard/admin/layout',
                           username: req.user.name,
                           email: req.user.email,
                           id: req.user._id,
                           prof_id: prof_id,
                           items: items
                        });
                     }
                  }
                  else if (!req.user) {
                     res.render('dashboard/doctor_profile', {
                        layout: 'layout.ejs',
                        prof_id: prof_id,
                        items: items
                     });
                  }
               }
            });
         } else {
            res.render('notFound')
         }
      });

      app.post('/getUsers/Doctors/1/p', (req, res) => {
         if (req.body.type === 'profile') {
            User.findOne({ _id: prof_id }, function (err, user) {
               if (err) {
                  res.send(err);
               }
               res.json(JSON.stringify(user));
            });
         }
      })
   }
   //Specialties route
   else if (req.originalUrl.split(/[/]/)[1] === 'specialties') {

      //Set specialty
      specialty = '';
      specialtyArr = req.originalUrl.split(/[/]/)[2].split(/[%20]/);
      specialtyArr.forEach(element => {
         if (element.length > 0) {
            if (specialty === '') {
               specialty += element
            }
            else {
               specialty += ` ${element}`;
            }
         }
      })


      User.find({ specialty: specialty }, (err, users) => {
         if (err) {
            console.log(err);
         }

         usersArr = users
      })

      imgModel.find({}, (err, items_) => {
         items = []
         if (err) {
            console.log(err);
         }
         items_.forEach(item => {
            usersArr.forEach(user => {
               if (user._id == item.id) {
                  items.push(item)
               }
            })
         })
      });

      setTimeout(function () {
         if (req.user) {
            if (req.user.type === 'patient') {
               //your code to be executed after 1 second

               res.render('dashboard/patient/specialties', {
                  layout: 'dashboard/patient/layout',
                  username: req.user.name,
                  email: req.user.email,
                  id: req.user._id,
                  specialty: specialty,
                  items: items
               })
            } else if (req.user.type === 'doctor') {
               res.render('dashboard/patient/specialties', {
                  layout: 'dashboard/patient/layout',
                  username: req.user.name,
                  email: req.user.email,
                  id: req.user._id,
                  specialty: specialty,
                  items: items
               })
            } else if (req.user.type === 'admin') {
               res.render('dashboard/patient/specialties', {
                  layout: 'dashboard/admin/layout',
                  username: req.user.name,
                  email: req.user.email,
                  id: req.user._id,
                  specialty: specialty,
                  items: items
               })
            }
         } else {
            res.render('dashboard/patient/specialties', {
               layout: 'layout.ejs',
               specialty: specialty,
               items: items
            });
         }
      }, 400);
      // res.send(`Page not ready yet \n, ${req.protocol} + :// + ${req.get('host')} + ${req.originalUrl}`)
   } else if (req.originalUrl.split(/[/]/)[1] === 'report') {
      if (req.user) {
         if (req.user.type === 'patient') {

            prof_id = req.originalUrl.split(/[/]/)[2];
            User.findOne({ _id: prof_id }, function (err, user) {
               if (err) {
                  res.render('notFound');
               } else {
                  res.render('dashboard/patient/report', {
                     layout: 'dashboard/patient/layout',
                     username: req.user.name,
                     email: req.user.email,
                     id: req.user._id,
                     reported_username: user.name,
                     reported_userId: user.id
                  });
               }

            })

            app.post('/report/doctor', ensureAuthenticated, (req, res) => {

               if (req.body.reason === '') {
                  res.json({
                     msg: 'Please enter a reason to your report'
                  })
               } else {
                  Report.findOne({
                     user_id: req.body.id,
                     reporting_user: req.user._id,
                  }, function (err, user) {
                     if (err) {
                        res.render('notFound')
                     } else {
                        if (!user) {

                           const newReport = new Report({
                              user_id: req.body.id,
                              reason: req.body.reason,
                              reporting_user: req.user._id
                           });

                           newReport.save().then(data => {
                              res.json({
                                 msg: 'User has been reported successfully'
                              });
                           })

                        } else {
                           res.json({
                              msg: 'Yοu have already reported this user!'
                           });
                        }
                     }
                  })
               }
            })

         } else {
            res.render('notFound')
         }
      } else {
         res.render('notFound')
      }
   }
   // /appointment/:appointment_id
   else if (req.originalUrl.split(/[/]/)[1] === 'appointment') {

      appointment_id = req.originalUrl.split(/[/]/)[2];

      if (req.user) {
         if (req.user.type === 'patient') {
            socketIo()

            Appointment.findOne({
               _id: appointment_id,
               'patient.id': req.user._id
            }, function (err, appointment) {
               if (err) {
                  res.send(err)
               } else {
                  if (appointment) {
                     res.render('dashboard/patient/appointment', {
                        layout: 'dashboard/patient/layout',
                        username: req.user.name,
                        email: req.user.email,
                        id: req.user._id,
                        appointment_id: appointment_id
                     })
                  } else
                     res.render('notFound')
               }
            })

         } else if (req.user.type === 'doctor') {

            socketIo()

            Appointment.findOne({
               _id: appointment_id,
               'doctor.id': req.user._id
            }, function (err, appointment) {
               if (err) {
                  res.send(err)
               } else {
                  if (appointment) {
                     res.render('dashboard/doctor/appointment', {
                        layout: 'dashboard/doctor/layout',
                        name: req.user.name,
                        surname: req.user.surname,
                        email: req.user.email,
                        id: req.user._id,
                        appointment_id: appointment_id
                     })
                  } else
                     res.render('notFound')
               }
            })

         }

         //Socket.io
         //When user connects

         function socketIo() {

            io.on('connection', function (socket) {
               io.removeAllListeners();

               Appointment.findOne({
                  _id: appointment_id,
               }, function (err, appointment) {
                  if (err) {
                     res.json({
                        err: err
                     });
                  }
                  //If patient has entered the appointment
                  if (req.user.type === 'patient') {
                     // let doctor_socket_id
                     appointment.patient.socket_id = socket.id;
                     appointment.patient.status = 'online';
                     appointment.save()
                  }
                  //If doctor has entered the appointment
                  else if (req.user.type === 'doctor') {
                     // let patient_socket_id
                     appointment.doctor.socket_id = socket.id;
                     appointment.doctor.status = 'online';
                     appointment.save()
                  }

                  if (appointment.doctor.status === 'online' && appointment.patient.status === 'online') {

                     let users = [appointment.patient.socket_id, appointment.doctor.socket_id]

                     users.forEach(userID => {
                        accessChat(userID)
                     })

                  }
               });

               socket.on('typing', (data) => {
                  //We're getting the appointment's data because we need the socket ids of our patient and our doctor
                  Appointment.findOne({
                     _id: appointment_id,
                  }, function (err, appointment) {

                     // If patient sent data that he's typing
                     if (data.type === 'patient') {
                        //Then we need to send it to the doctor
                        if (data.typing === true) {
                           socket.broadcast.to(appointment.doctor.socket_id).emit('typing', `${appointment.patient.name} ${appointment.patient.name} is typing...`)
                        }
                        //If he's no longer typing 
                        else {
                           socket.broadcast.to(appointment.doctor.socket_id).emit('typing', ``)
                        }
                     }
                     // Else if doctor sent data that he's typing 
                     else if (data.type === 'doctor') {
                        if (data.typing === true) {
                           socket.broadcast.to(appointment.patient.socket_id).emit('typing', `Dr. ${appointment.doctor.name} ${appointment.doctor.name} is typing...`)
                        }
                        //If he's no longer typing                         
                        else {
                           socket.broadcast.to(appointment.patient.socket_id).emit('typing', ``)
                        }
                     }
                  })
               })

               socket.on('sendMessage', (data) => {
                  //We're getting the appointment's data because we need the socket ids of our patient and our doctor
                  Appointment.findOne({
                     _id: appointment_id,
                  }, function (err, appointment) {

                     //Push message data to the database's array where chat data is stored
                     appointment.chat.push(data);
                     appointment.save();

                     // If the message is from the patient
                     if (data.from === 'patient') {
                        //Send to doctor
                        socket.broadcast.to(appointment.doctor.socket_id).emit('receiveMessage', data)
                     }
                     // Else if the message is from the doctor 
                     else if (data.from === 'doctor') {
                        //Send to patient
                        socket.broadcast.to(appointment.patient.socket_id).emit('receiveMessage', data)
                     }
                  })
               })

               function accessChat(socketID) {
                  socket.broadcast.to(socketID).emit('accessChat', 'true')
               }

               socket.on('callEvent', (data) => {
                  Appointment.findOne({
                     _id: appointment_id,
                  }, function (err, appointment) {
                     if (data.caller === 'patient') {
                        socket.broadcast.to(appointment.doctor.socket_id).emit('callEvent', {
                           caller: `${appointment.patient.name} ${appointment.patient.surname}`
                        })
                     } else if (data.caller === 'doctor') {
                        socket.broadcast.to(appointment.patient.socket_id).emit('callEvent', {
                           caller: `${appointment.doctor.name} ${appointment.doctor.surname}`
                        })
                     }
                  })
               })

               socket.on('cancelCall', (data) => {
                  Appointment.findOne({
                     _id: appointment_id,
                  }, function (err, appointment) {
                     if (data.from === 'patient') {
                        socket.broadcast.to(appointment.doctor.socket_id).emit('cancelCall', {
                           caller: `${appointment.patient.name} ${appointment.patient.surname}`
                        })
                     } else if (data.from === 'doctor') {
                        socket.broadcast.to(appointment.patient.socket_id).emit('cancelCall', {
                           caller: `${appointment.doctor.name} ${appointment.doctor.surname}`
                        })
                     }
                  })
               })

               socket.on('acceptCall', (data) => {
                  Appointment.findOne({
                     _id: appointment_id,
                  }, function (err, appointment) {
                     if (data.from === 'patient') {
                        socket.broadcast.to(appointment.doctor.socket_id).emit('acceptCall', {
                           caller: `${appointment.patient.name} ${appointment.patient.surname}`
                        })
                     } else if (data.from === 'doctor') {
                        socket.broadcast.to(appointment.patient.socket_id).emit('acceptCall', {
                           caller: `${appointment.doctor.name} ${appointment.doctor.surname}`
                        })
                     }
                  })
               })

               socket.on('endCall', (data) => {
                  Appointment.findOne({
                     _id: appointment_id,
                  }, function (err, appointment) {
                     if (data.from === 'patient') {
                        socket.broadcast.to(appointment.doctor.socket_id).emit('endCall', {
                           end: true
                        })
                     } else if (data.from === 'doctor') {
                        socket.broadcast.to(appointment.patient.socket_id).emit('endCall', {
                           end: true
                        })
                     }
                  })
               })

               //Video offer

               socket.on('videoOffer', (data) => {
                  online.forEach(user => {
                     if (user.id === data.receiver.id) {
                        socket.broadcast.to(user.socketID).emit('videoOffer', data)
                     }
                  })
               })

               socket.on('callAnswer', (data) => {
                  let uid = data.uid
                  online.forEach(user => {
                     if (user.id === data.answerTo.id) {
                        socket.broadcast.to(user.socketID).emit('videoOfferAnswer', data)
                        //data to send with videoOfferAnswer are the same with the received from callAnswer:
                        //    {
                        //       answer: 'accept/decline',
                        //       answerFrom: {
                        //           id: data.receiver.id,
                        //           name: data.receiver.name
                        //       },
                        //       answerTo: {
                        //           id: data.sender.senderId,
                        //           name: data.sender.senderName
                        //       }
                        //   }
                     }
                  })
               })

               socket.on("NewClient", function () {
                  if (clients < 2) {
                     if (clients == 1) {
                        socket.emit('CreatePeer')
                     }
                     clients++;
                  }
                  else
                     socket.emit('SessionActive')
               })

               socket.on('Offer', function (offer) {
                  socket.broadcast.emit("BackOffer", offer)
               })

               socket.on('Answer', function (data) {
                  this.broadcast.emit("BackAnswer", data)
               })

               //Whenever someone disconnects this piece of code executed

               socket.on('disconnect', function () {


                  if (clients > 0) {
                     if (clients <= 2)
                        this.broadcast.emit("Disconnect")
                     clients--
                  }

                  if (req.user.type === 'patient') {
                     Appointment.findOne({
                        _id: appointment_id,
                     }, function (err, appointment) {
                        if (err) {
                           res.json({
                              err: err
                           });
                        }

                        appointment.patient.socket_id = ''
                        appointment.patient.status = 'offline'
                        appointment.save()

                        //Send event that patient disconnected
                        socket.broadcast.to(appointment.doctor.socket_id).emit('peerDisconnected', `Patient left`)

                     })

                  } else if (req.user.type === 'doctor') {
                     Appointment.findOne({
                        _id: appointment_id,
                     }, function (err, appointment) {
                        if (err) {
                           res.json({
                              err: err
                           });
                        }

                        appointment.doctor.socket_id = ''
                        appointment.doctor.status = 'offline'
                        appointment.save()

                        //Send event that doctor disconnected
                        socket.broadcast.to(appointment.patient.socket_id).emit('peerDisconnected', `Doctor left`)

                     })

                  }


               });
            });
         }

      } else {
         res.render('notFound')
      }

      app.post('/getAppointments/1', ensureAuthenticated, (req, res) => {
         Appointment.findOne({
            _id: req.body.appointment_id
         }, function (err, appointment) {
            if (err) {
               res.json(err)
            } else {
               res.json(appointment)
            }
         })
      })
   }
   else {
      res.render('notFound');
   }


   app.post('/specialties/users', (req, res) => {
      User.find({ specialty: specialty }, function (err, users) {
         if (err) {
            res.send(err);
         }
         res.json(users)
      });
   })

   app.post('/getImage/1', (req, res) => {
      imgModel.find({ id: req.body._id }, (err, items) => {
         if (err) {
            console.log(err);
         }
         res.json(items)
      });
   })

})


http.listen(PORT);