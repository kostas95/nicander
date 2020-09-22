var express = require('express');
const bodyparser = require('body-parser');
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
var CryptoJS = require("crypto-js");
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
// var MongoClient = require('mongodb').MongoClient
const mongoose = require('mongoose');
const User = require('./models/User');
const Post = require('./models/Post');
const Appointment = require('./models/Appointment')
const EmergencyAppointment = require('./models/EmergencyAppointment')
const Notification = require('./models/Notification')
const Message = require('./models/Message')
const Email = require('./models/Email')
const Report = require('./models/Report')
const Adr = require('./models/Adr')
const Review = require('./models/Review')
const SysReview = require('./models/SysReview')
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

//Transporter for nodemailer email
const transporter = nodemailer.createTransport({
   service: 'gmail',
   auth: {
      user: 'nicanderapp@gmail.com',
      pass: 'NIC4ND3R'
   }
});


// Express body parser
app.use(express.urlencoded({ extended: false }));
// Body parser for json (used for fetch)
app.use(express.json());
app.use(methodOverride('_method'));

//Multer

var storageMulter = multer.diskStorage({
   destination: (req, file, cb) => {
      cb(null, 'uploads')
   },
   filename: (req, file, cb) => {
      cb(null, file.fieldname + '-' + Date.now())
   }
});

var upload = multer({ storage: storageMulter });

// Passport Config
require('./config/passport')(passport);

const conn = mongoose.createConnection(MONGODB_URI);

// Init gfs
let gfs;

conn.once('open', () => {
   // Init stream
   gfs = Grid(conn.db, mongoose.mongo);
   gfs.collection('uploads');
});

// Create storage engine
const storage = new GridFsStorage({
   url: MONGODB_URI,
   file: (req, file) => {
      return new Promise((resolve, reject) => {
         crypto.randomBytes(16, (err, buf) => {
            if (err) {
               return reject(err);
            }
            const filename = buf.toString('hex') + path.extname(file.originalname);
            //For unregistered users
            console.log(req.user)
            if (typeof req.user === "undefined") {
               const fileInfo = {
                  filename: filename,
                  bucketName: 'uploads',
                  metadata: {
                     appointment_id: req.originalUrl.split(/[/]/)[3],
                     user_type: 'patient'
                  }
               };
               resolve(fileInfo);
            } else {
               if (req.originalUrl.split(/[/]/)[2] === 'appointment') {
                  const fileInfo = {
                     filename: filename,
                     bucketName: 'uploads',
                     metadata: {
                        appointment_id: req.originalUrl.split(/[/]/)[3],
                        user_type: req.user.type
                     }
                  };
                  resolve(fileInfo);
               } else {
                  const fileInfo = {
                     filename: filename,
                     bucketName: 'uploads',
                     metadata: {
                        appointment_id: req.originalUrl.split(/[/]/)[2],
                        user_type: req.user.type
                     }
                  };
                  resolve(fileInfo);
               }
            }
         });
      });
   }
});
const _upload = multer({ storage });

// init sessions for passport
var session = require("express-session");
const { json } = require('express');
const e = require('express');
const { X_OK } = require('constants');
const { report } = require('process');
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

//Create random string
function makeid(length) {
   var result = '';
   var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return CryptoJS.AES.encrypt(result, "Secret Passphrase").toString();;
}

//Routes

//(GET) Main Page Route
app.get('/', forwardAuthenticated, function (req, res) {
   res.render('welcome');
});

//(GET) About Route
app.get('/about', forwardAuthenticated, (req, res) => {
   res.render('about');
})

//(GET) About Route
app.get('/community', forwardAuthenticated, (req, res) => {
   res.render('community');
})

//(GET) Contact Page Route
app.get('/contact', forwardAuthenticated, function (req, res) {
   res.render('contact');
});

//(GET) Emergency Page Route
app.get('/emergency', forwardAuthenticated, function (req, res) {
   res.render('emergency/emergency');
});

//(GET) Emergency Page Route
app.get('/emergency/appointment', forwardAuthenticated, function (req, res) {
   res.render('emergency/appointment/emergency-data');
});

//(POST) Emergency-appointment Page Route
app.post('/emergency/appointment', forwardAuthenticated, function (req, res) {
   const newAppointment = new EmergencyAppointment({
      doctor: req.body.doctor,
      patient: req.body,
      registered: false
   });

   newAppointment.save().then(appointment => {
      res.json({
         url: `/emergency/appointment/${appointment._id}`
      })
   })
});

//(POST) Emergency-appointment Page Route (registered user)
app.post('/emergency/appointment/registered', ensureAuthenticated, function (req, res) {
   console.log(req.body.id)
   User.findOne({
      _id: req.body.id
   }, function (err, user) {
      if (err) {
         res.send(err);
      }

      const newAppointment = new EmergencyAppointment({
         patient: {
            id: user._id,
            name: user.name,
            surname: user.surname,
            email: user.email,
            telephone: user.telephone,
            year: user.yy,
            day: user.dd,
            month: user.mm,
            gender: user.gender
         },
         registered: true
      });

      newAppointment.save().then(appointment => {
         res.json({
            url: `/emergency/appointment/${appointment._id}`
         })
      })
   });
});

//(GET) Emergency-appointment Page Route
app.get('/emergency/report', forwardAuthenticated, function (req, res) {
   res.render('emergency/adr/emergency-report');
});

//(GET) Emergency-appointment Page Route PATIENT
app.get('/dashboard/emergency/report', ensureAuthenticated, function (req, res) {
   res.render('emergency/adr/emergency-report', {
      layout: 'dashboard/patient/layout',
      username: req.user.name,
      email: req.user.email,
      id: req.user._id
   });
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

//(GET) System doctor Login
app.get('/system-doctor/login', forwardAuthenticated, function (req, res) {
   res.render('login/login-system-doctor', { error: req.flash('error') });
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

//(POST) System doctor Logins to system
app.post('/system-doctor/login', (req, res, next) => {
   passport.authenticate('local', {
      successRedirect: '/dashboard',
      failureRedirect: '/system-doctor/login',
      failureFlash: true
   })(req, res, next);
});

//(POST) Post info in order to see an emergency doctor
app.post('/emergency/appointment', (req, res) => {
   console.log(req.body)
});

//ROUTES THAT MULTIPLE USER TYPES CAN VISIT

//Unauthorized route
app.get('/unauthorized', ensureAuthenticated, function (req, res) {

   if (req.user.emailAuthorized === false) {

      let params
      if (req.user.type === 'patient') {
         params = {
            layout: 'dashboard/patient/layout',
            username: req.user.name,
            email: req.user.email,
            id: req.user._id
         }
      } else if (req.user.type === 'doctor') {
         params = {
            layout: 'dashboard/doctor/layout',
            username: req.user.name,
            email: req.user.email,
            id: req.user._id
         }
      }
      res.render('dashboard/unauthorized', params);
   } else if (req.user.emailAuthorized === true) {
      res.redirect('/dashboard')
   }
})

//Dashboard route
//Check requesting user type and render the correct .ejs file

app.get('/dashboard', ensureAuthenticated, function (req, res) {

   if (req.user.emailAuthorized === false) {
      res.redirect('/unauthorized')
   } else if (req.user.emailAuthorized === true) {
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
      if (req.user.type === 'systemDoctor') {

         res.render('dashboard/system-doctor/home', {
            layout: 'dashboard/system-doctor/layout',
            username: req.user.name,
            surname: req.user.surname,
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
   }
});

//PERSONAL-DETAILS (USERS PROFILE ROUTES)
//RETRIEVE IMAGE
// https://www.geeksforgeeks.org/upload-and-retrieve-image-on-mongodb-using-mongoose/
app.get('/dashboard/personal-details', ensureAuthenticated, (req, res) => {

   if (req.user.emailAuthorized === false) {
      res.redirect('/unauthorized')
   } else if (req.user.emailAuthorized === true) {
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
   }
})

//My appointments page: Appointments
app.get('/dashboard/my-appointments', ensureAuthenticated, (req, res) => {
   if (req.user.emailAuthorized === false) {
      res.redirect('/unauthorized')
   } else if (req.user.emailAuthorized === true) {
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
      } else {
         res.render('notFound')
      }
   }
})

//My appointments page: Requests
app.get('/dashboard/my-appointments/requests', ensureAuthenticated, (req, res) => {
   if (req.user.emailAuthorized === false) {
      res.redirect('/unauthorized')
   } else if (req.user.emailAuthorized === true) {
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
      } else {
         res.render('notFound')
      }
   }
})

//My appointments page: History/Completed
app.get('/dashboard/my-appointments/history', ensureAuthenticated, (req, res) => {
   if (req.user.emailAuthorized === false) {
      res.redirect('/unauthorized')
   } else if (req.user.emailAuthorized === true) {
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
      } else {
         res.render('notFound')
      }
   }
})

//My appointments page: Rejected/Cancelled
app.get('/dashboard/my-appointments/cancelled', ensureAuthenticated, (req, res) => {
   if (req.user.emailAuthorized === false) {
      res.redirect('/unauthorized')
   } else if (req.user.emailAuthorized === true) {
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
      } else {
         res.render('notFound')
      }
   }
})

//My appointments page: Emergencies
app.get('/dashboard/my-appointments/emergencies', ensureAuthenticated, (req, res) => {
   if (req.user.emailAuthorized === false) {
      res.redirect('/unauthorized')
   } else if (req.user.emailAuthorized === true) {
      if (req.user.type === 'patient') {
         res.render('dashboard/patient/my-appointments/emergencies', {
            layout: 'dashboard/patient/layout',
            username: req.user.name,
            surname: req.user.surname,
            email: req.user.email,
            id: req.user._id
         });
      } else {
         res.render('notFound')
      }
   }
})

//System doctor emergency appointments history
app.get('/dashboard/emergencies/history', ensureAuthenticated, (req, res) => {
   if (req.user.type === 'systemDoctor') {

      res.render('dashboard/system-doctor/appointments-history', {
         layout: 'dashboard/system-doctor/layout',
         username: req.user.name,
         email: req.user.email,
         id: req.user._id
      });
   } else {
      res.render('notFound')
   }
})

//System doctor emergency appointments ignored
app.get('/dashboard/emergencies/ignored', ensureAuthenticated, (req, res) => {
   if (req.user.type === 'systemDoctor') {

      res.render('dashboard/system-doctor/appointments-ignored', {
         layout: 'dashboard/system-doctor/layout',
         username: req.user.name,
         email: req.user.email,
         id: req.user._id
      });
   } else {
      res.render('notFound')
   }
})

//System doctor emergency appointments ignored
app.get('/dashboard/reporting-forms', ensureAuthenticated, (req, res) => {
   if (req.user.type === 'systemDoctor') {

      res.render('dashboard/system-doctor/adr-reports', {
         layout: 'dashboard/system-doctor/layout',
         username: req.user.name,
         surname: req.user.surname,
         email: req.user.email,
         id: req.user._id
      });
   } else {
      res.render('notFound')
   }
})

//Reviews page
app.get('/dashboard/reviews', ensureAuthenticated, (req, res) => {
   if (req.user.emailAuthorized === false) {
      res.redirect('/unauthorized')
   } else if (req.user.emailAuthorized === true) {
      if (req.user.type === 'patient') {
         res.render('dashboard/patient/reviews', {
            layout: 'dashboard/patient/layout',
            username: req.user.name,
            surname: req.user.surname,
            email: req.user.email,
            id: req.user._id
         });
      } else {
         res.render('notFound')
      }
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
   if (req.user.emailAuthorized === false) {
      res.redirect('/unauthorized')
   } else if (req.user.emailAuthorized === true) {
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
   }
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

//Manage System Doctors
app.get('/dashboard/users-management/system-doctors', ensureAuthenticated, function (req, res) {
   if (req.user.type === 'admin') {
      res.render('dashboard/admin/users-management/system-doctors', {
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

//Manage Reported Users
app.get('/dashboard/reports', ensureAuthenticated, function (req, res) {
   if (req.user.type === 'admin') {
      res.render('dashboard/admin/reports', {
         layout: 'dashboard/admin/layout',
         email: req.user.email,
         username: req.user.name,
         id: req.user._id
      });
   } else {
      res.render('notFound')
   }
})

//Contact platform
app.get('/dashboard/contact-platform', ensureAuthenticated, function (req, res) {
   if (req.user.type === 'admin') {
      res.render('dashboard/admin/contact-platform', {
         layout: 'dashboard/admin/layout',
         email: req.user.email,
         name: req.user.name,
         surname: req.user.surname,
         id: req.user._id
      });
   } else {
      res.render('notFound')
   }
})

//Email notifications
app.get('/dashboard/email-notifications', ensureAuthenticated, function (req, res) {
   if (req.user.type === 'admin') {
      res.render('dashboard/admin/email-notifications/email-notifications', {
         layout: 'dashboard/admin/layout',
         email: req.user.email,
         name: req.user.name,
         surname: req.user.surname,
         id: req.user._id
      });
   } else {
      res.render('notFound')
   }
})

//Email notifications history
app.get('/dashboard/email-notifications/history', ensureAuthenticated, function (req, res) {
   if (req.user.type === 'admin') {
      res.render('dashboard/admin/email-notifications/history', {
         layout: 'dashboard/admin/layout',
         email: req.user.email,
         name: req.user.name,
         surname: req.user.surname,
         id: req.user._id
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
      if (req.body.usertype === 'systemDoctor') {
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

               var mailOptions = {
                  from: 'nicander',
                  to: doc.email,
                  subject: 'Account authorized',
                  text: `Your account has been authorized by our system administrators. \nUse this password to activate your account ${CryptoJS.AES.decrypt(doc.emailPassword, "Secret Passphrase").toString(CryptoJS.enc.Utf8)} `
               };

               transporter.sendMail(mailOptions, function (error, info) {
                  if (error) {
                     console.log(error);
                  } else {
                     console.log('Email sent: ' + info.response);
                  }
               })
            }
         })
   }
});

//Delete user and his profile photo
app.post('/delUser', ensureAuthenticated, (req, res) => {
   if (req.user.type === 'admin') {
      User.findOne(
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
               } else if (user.type === 'systemDoctor') {
                  res.json({
                     msg: 'System doctor removed from system',
                     url: '/dashboard/users-management/admins'
                  })
               }

               user.remove()
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
                  authorized: true,
                  emailAuthorized: true
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

//Add system doctor
app.post('/dashboard/users-management/system-doctors', ensureAuthenticated, (req, res) => {
   User.findOne({
      email: req.body.email,
      type: 'systemDoctor'
   }).then((doctor) => {
      if (doctor) {
         res.render('dashboard/admin/users-management/system-doctors', {
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
         const newDoc = new User({
            name: req.body.name,
            surname: req.body.surname,
            email: req.body.email,
            password: req.body.password,
            type: 'systemDoctor',
            authorized: true,
            emailAuthorized: true
         });

         bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(newDoc.password, salt, (err, hash) => {
               if (err) throw err;
               newDoc.password = hash;
               newDoc
                  .save()
                  .then(doctor => {
                     res.render('dashboard/admin/users-management/system-doctors', {
                        layout: 'dashboard/admin/layout',
                        username: req.user.name,
                        email: req.user.email,
                        id: req.user._id,
                        msg: 'Doctor added',
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

// @route GET /download/:filename
// @desc  Download single file object
app.get('/download/:filename', (req, res) => {
   gfs.files.findOne({
      filename: req.params.filename
   }, (err, file) => {
      // Check if file
      if (!file || file.length === 0) {
         return res.status(404).json({
            err: 'No file exists'
         });
      }
      // File exists
      res.set('Content-Type', file.contentType);
      res.set('Content-Disposition', 'attachment; filename="' + file.filename + '"');
      // streaming from gridfs
      var readstream = gfs.createReadStream({
         filename: req.params.filename
      });
      const writestream = gfs.createWriteStream({
         filename: req.params.filename
         // content_type: file.mimetype, // image/jpeg or image/png
      });
      //error handling, e.g. file does not exist
      readstream.on('error', function (err) {
         console.log('An error occurred!', err);
         throw err;
      });
      readstream.pipe(res);
   });
});

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
         const emailPassword = makeid(20)
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
            authorized: true,
            emailAuthorized: false,
            emailPassword: emailPassword
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

         var mailOptions = {
            from: 'nicander',
            to: req.body.email,
            subject: 'Authorization for your nicander account',
            text: `We are very happy that you joined Nicander. Your password is ${CryptoJS.AES.decrypt(emailPassword, "Secret Passphrase").toString(CryptoJS.enc.Utf8)}`
         };

         transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
               console.log(error);
            } else {
               console.log('Email sent: ' + info.response);
            }
         })
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
         const emailPassword = makeid(20)
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
            authorized: false,
            emailAuthorized: false,
            emailPassword: emailPassword
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

         var mailOptions = {
            from: 'nicander',
            to: req.body.email,
            subject: 'Authorization for your nicander account',
            text: `We are very happy that you joined Nicander.\nPlease wait until the system's administrators approve your account.\n Then you will have the right to use this password. \nYour password is ${CryptoJS.AES.decrypt(emailPassword, "Secret Passphrase").toString(CryptoJS.enc.Utf8)} `
         };

         transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
               console.log(error);
            } else {
               console.log('Email sent: ' + info.response);
            }
         })

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

//Route for getting all the reports
app.get('/getReports', ensureAuthenticated, (req, res) => {
   let reports_arr = []
   Report.find().exec(function (err, reports) {
      if (err) {
         console.log(err)
      }

      res.json({
         reports: reports
      });
   })

})

app.post('/getReportedUser', (req, res) => {
   //Reported user

   User.findOne({
      _id: req.body.user_id
   }).exec(function (err, user) {
      if (err) {
         console.log(err)
      }

      res.json({
         user: user,
         'info': 'reported user'
      });

   })

})

app.post('/getReportingUser', (req, res) => {
   //Reporting user

   User.findOne({
      _id: req.body.user_id
   }).exec(function (err, user) {
      if (err) {
         console.log(err)
      }

      res.json({
         user: user,
         'info': 'reporting user'
      });

   })
})

app.post('/reportBtnAction', (req, res) => {
   if (req.body.action === 'ban') {
      //find user and change banned status to banned
      User.findOne({ _id: req.body.id }, function (err, user) {
         if (user) {
            user.banned = 'true'
            user.save();
         }

         res.json({
            msg: `${user.name} ${user.surname} banned succesfully`
         })
      });
   } else {
      res.json({
         msg: `Report request is ignored`
      })
   }

   Report.findOneAndRemove(
      { _id: req.body.report_id },
      (err, report) => {
         if (err) {
            console.log(err)
         }
      })
})

//Route for getting all the reviews from specific user
app.post('/getReviews/patient', ensureAuthenticated, (req, res) => {

   Review.find({
      "patient.id": req.body.id
   }).exec(function (err, reviews) {
      if (err) {
         console.log(err)
      }

      res.json({
         reviews: reviews
      });
   })

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
})

//Rate appointment
app.post('/review', (req, res) => {

   Review.findOne({
      appointment_id: req.body.appointment_id,
   }).exec(function (err, review) {
      if (err) {
         res.json(err)
      } else {
         if (review) {
            if (req.body.edit === true) {
               review.rating = req.body.rating,
                  review.comment = req.body.comment

               review.save()
               res.json({
                  'msg': 'Review edited successfully',
                  type: 'success'
               })
            } else {
               res.json({
                  'msg': 'You have already rated the doctor at this appointment',
                  type: 'fail'
               })
            }
         } else {
            const newReview = new Review({
               comment: req.body.comment,
               rating: req.body.rating,
               patient: {
                  id: req.body.patient.id,
                  name: req.body.patient.name,
                  surname: req.body.patient.surname
               },
               doctor: {
                  id: req.body.doctor.id,
                  name: req.body.doctor.name,
                  surname: req.body.doctor.surname
               },
               appointment_id: req.body.appointment_id
            });

            newReview.save().then(data => {
               res.json({
                  'msg': 'Rating submitted successfully',
                  type: 'success'
               })
            })
         }
      }

   })
})

//Get reviews
app.post('/getReviews', (req, res) => {
   Review.find({
      'doctor.id': req.body.user_id,
   }).exec(function (err, reviews) {
      if (err) {
         res.json(err)
      } else {
         if (reviews.length > 0) {
            res.json({
               reviews: reviews,
               type: 'success'
            })
         } else {
            res.json({
               msg: 'There are no reviews for this doctor',
               type: 'fail'
            })
         }
      }

   })
})

app.post('/getReviews/specialty', (req, res) => {

   Review.find({
      'doctor.id': req.body.user_id
   }).exec(function (err, reviews) {
      if (err) {
         res.json(err)
      } else {
         if (reviews.length > 0) {
            res.json(reviews)
         } else {
            res.json(reviews)
         }
      }
   })

})

//Diagnosis
//Rate appointment
app.post('/diagnosis', (req, res) => {

   Appointment.findOne({
      _id: req.body.appointment_id,
   }).exec(function (err, appointment) {
      if (err) {
         res.json(err)
      } else {

         const newDiagnosis = {
            diagnosis: req.body.diagnosis,
            treatment: req.body.treatment,
            comments: req.body.comments,
            appointment_id: req.body.appointment_id
         };

         appointment.diagnosis = newDiagnosis

         appointment.save().then(data => {
            res.json({
               'msg': 'Diagnosis added successfully',
               type: 'success'
            })
         })
      }

      //Add the noti here
      const notification = new Notification({
         status: 'unseen',
         content: `Dr.${appointment.doctor.surname} ${appointment.doctor.name} has added a diagnosis for the appointment on ${appointment.timestamp}`,
         user_id: appointment.patient.id,
         href: `/appointment/${appointment._id}`
      }).save().then(notification => {
         true
      })

   })
})

//Diagnosis emergency
app.post('/diagnosis/emergency', (req, res) => {

   EmergencyAppointment.findOne({
      _id: req.body.appointment_id,
   }).exec(function (err, appointment) {
      if (err) {
         res.json(err)
      } else {

         const newDiagnosis = {
            diagnosis: req.body.diagnosis,
            treatment: req.body.treatment,
            comments: req.body.comments,
            appointment_id: req.body.appointment_id
         };

         appointment.diagnosis = newDiagnosis

         appointment.save().then(data => {
            res.json({
               'msg': 'Diagnosis added successfully',
               type: 'success'
            })
         })
      }

      if (appointment.registered === true) {
         //Add the noti here
         const notification = new Notification({
            status: 'unseen',
            content: `Dr.${appointment.doctor.surname} ${appointment.doctor.name} has added a diagnosis for the appointment on ${new Date(appointment.date).toString().substring(0, 25)}`,
            user_id: appointment.patient.id,
            href: `/appointment/${appointment._id}`
         }).save().then(notification => {
            true
         })
      }

   })
})

//Contact page, send message
app.post('/message', (req, res) => {
   const message = new Message({
      message: req.body.message,
      name: req.body.name,
      surname: req.body.surname,
      email: req.body.email
   }).save()

   res.json({
      msg: 'Message sent successfully'
   })
})

//Change message status from unseen to seen (contact platform)
app.post('/message/status', (req, res) => {
   Message.findOne({
      _id: req.body.id
   }).exec(function (err, message) {
      if (err) {
         console.log(err)
      } else {
         message.status = req.body.status
         message.save()

         res.json(true)
      }
   })
})

//Save reply to database (contact platform)
app.post('/message/reply', (req, res) => {
   Message.findOne({
      _id: req.body.id
   }).exec(function (err, message) {
      if (err) {
         console.log(err)
      } else {
         message.replies.push({
            body: req.body.reply,
            sender: req.body.sender
         })
         message.save()

         output = `
         <style>
         * {
            padding: 0;
            margin: 0;
            font-family: 'Arial', 'sans-serif';
         }

         a {
            text-decoration: none;
            color: #444444;
         }

         h2 {
            color: rgb(109, 50, 109);
         }

         .margin {
            margin: 0 auto;
         }

         .bg {
            background-color: #eff9fc;
         }

         .bg-2 {
            background-color: #ffffff;
            padding: 4rem 2rem;
            line-height: 22px;
            font-size: 14px;
            color: #444444;
            border-radius: 5px;
            display: block;
            margin: 0 auto;
         }

         .container {
            display: block;
            margin: 0 auto;
         }

         .width-90 {
            width: 90%;
         }

         .width-50 {
            width: 50%;
         }

         .border {
            border: 1px solid black
         }

         .padding-10px {
            padding: 10px;
         }

         .border-bottom {
            border-bottom: 1px solid #444444;
         }
         
         .center, h2{
            text-align: center;
         }
         </style>
         <div class='container width-100 border padding-10px margin bg'>
            <h2 class="padding-10px">
               <strong>Nicander</strong>
            </h2>

            <div class='container width-90 padding-10px'>
               <div class='bg-2 width-50'>
                  <div class="container border-bottom padding-10px">
                     <strong>${CryptoJS.AES.decrypt(req.body.reply, "Secret Passphrase").toString(CryptoJS.enc.Utf8)}</strong>
                  </div>
                  <div class="container padding-10px">
                     <div class="container padding-10px">
                        <div class='container'>${message.name} ${message.surname}</div>   
                        <div class='container'>${message.email}</div>   
                        <div class='container'>${message.date.toString().substring(0, 24)}</div>
                     </div>
                     <div class="container padding-10px">
                        ${CryptoJS.AES.decrypt(message.message, "Secret Passphrase").toString(CryptoJS.enc.Utf8)}
                     </div>
                  </div>
               </div>
            </div>
         </div>
         `

         var mailOptions = {
            from: 'nicander',
            to: `${req.body.receiver}`,
            subject: `Reply to the message you sent on ${req.body.date.substring(8, 10)}-${req.body.date.substring(5, 7)}-${req.body.date.substring(0, 4)},${req.body.date.substring(11, 16)}`,
            html: output
         };

         transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
               console.log(error);
            } else {
               console.log('Email sent: ' + info.response);
               res.json({
                  msg: 'Reply sent successfully'
               })
            }
         });

      }
   })
})

//Get all messages (Contact platform admin)
app.get('/getMessages', ensureAuthenticated, (req, res) => {
   Message.find().exec(function (err, messages) {
      if (err) {
         res.json(err)
      } else {
         res.json(messages)
      }
   })
})

//Get all messages (Contact platform admin)
app.get('/getMessages/unread', ensureAuthenticated, (req, res) => {
   Message.find({
      status: 'unread'
   }).exec(function (err, messages) {
      if (err) {
         res.json(err)
      } else {
         res.json(messages)
      }
   })
})

//Get all messages (Contact platform admin)
app.get('/getEmails', ensureAuthenticated, (req, res) => {
   Email.find().exec(function (err, emails) {
      if (err) {
         res.json(err)
      } else {
         res.json(emails)
      }
   })
})

//Get all messages (Contact platform admin)
app.post('/email', ensureAuthenticated, (req, res) => {

   const newEmail = new Email({
      subject: req.body.subject,
      body: req.body.body,
      sender: req.body.sender,
      receivers: req.body.receivers
   }).save()

   //Put <br> inside the message in order to create line breaks in the innerHTML below
   let message = ''

   CryptoJS.AES.decrypt(req.body.body, "Secret Passphrase").toString(CryptoJS.enc.Utf8).split(/\r?\n/g).forEach(chunk => {
      message += `${chunk} <br>`
   })

   output = `
         <style>
         * {
            padding: 0;
            margin: 0;
            font-family: 'Arial', 'sans-serif';
         }

         a {
            text-decoration: none;
            color: #444444;
         }

         h2 {
            color: rgb(109, 50, 109);
         }

         .margin {
            margin: 0 auto;
         }

         .bg {
            background-color: #eff9fc;
         }

         .bg-2 {
            background-color: #ffffff;
            padding: 4rem 2rem;
            line-height: 22px;
            font-size: 14px;
            color: #444444;
            border-radius: 5px;
            display: block;
            margin: 0 auto;
         }

         .container {
            display: block;
            margin: 0 auto;
         }

         .width-90 {
            width: 90%;
         }

         .width-50 {
            width: 50%;
         }

         .border {
            border: 1px solid black
         }

         .padding-10px {
            padding: 10px;
         }
         
         .center, h2{
            text-align: center;
         }
         </style>
         <div class='container width-100 border padding-10px margin bg'>
            <h2 class="padding-10px">
               <strong>Nicander</strong>
            </h2>

            <div class='container width-90 padding-10px'>
               <div class='bg-2 width-50'>
                  <div class="container padding-10px" style='font-size:1rem'>
                     <strong>
                     ${CryptoJS.AES.decrypt(req.body.subject, "Secret Passphrase").toString(CryptoJS.enc.Utf8)}
                     </strong>
                  </div>
                  <div class="container padding-10px">
                     ${message}
                  </div>
               </div>
            </div>
         </div>
         `

   let count = 0
   if (req.body.receivers === 'all') {
      User.find({}, (err, users) => {
         if (err) {
            console.log(err);
         }

         users.forEach(user => {
            count++
            emailData(user.email, CryptoJS.AES.decrypt(req.body.subject, "Secret Passphrase").toString(CryptoJS.enc.Utf8), count, users.length)
         })
      })

   } else if (req.body.receivers === 'doctors') {
      User.find({ type: 'doctor' }, (err, users) => {
         if (err) {
            console.log(err);
         }

         users.forEach(user => {
            count++
            emailData(user.email, CryptoJS.AES.decrypt(req.body.subject, "Secret Passphrase").toString(CryptoJS.enc.Utf8), count, users.length)
         })
      })
   } else if (req.body.receivers === 'patients') {
      User.find({ type: 'patient' }, (err, users) => {
         if (err) {
            console.log(err);
         }

         users.forEach(user => {
            count++
            emailData(user.email, CryptoJS.AES.decrypt(req.body.subject, "Secret Passphrase").toString(CryptoJS.enc.Utf8), count, users.length)

         })
      })
   }

   function emailData(email, subject, count, length) {
      var mailOptions = {
         from: 'nicander',
         to: email,
         subject: subject,
         html: output
      };

      transporter.sendMail(mailOptions, function (error, info) {
         if (error) {
            res.json({
               msg: 'There was an error while sending the email',
               type: 'error'
            })
         } else {
            console.log('Email sent: ' + info.response);
            console.log(length, count)
            if (count === length - 1) {
               res.json({
                  msg: 'Email sent successfully',
                  type: 'success'
               })
            }
         }
      });
   }
})

//Authorization password
app.post('/unauthorized/auth', function (req, res) {

   User.findOne({
      _id: req.body.id
   }, function (err, user) {
      if (err) {
         res.json(err)
      } else {
         const emailPassword = CryptoJS.AES.decrypt(user.emailPassword, "Secret Passphrase").toString(CryptoJS.enc.Utf8)
         if (emailPassword === req.body.password) {
            user.emailAuthorized = true;
            user.save()
            req.session.passport.user.emailAuthorized = true

            res.json({
               url: '/dashboard'
            })
         } else {
            res.json({
               msg: 'Password incorrect!'
            })
         }
      }
   })
})

//Resend email that contains emailPassword for user authorization
app.post('/resendEmail', function (req, res) {

   User.findOne({
      _id: req.body.id
   }, function (err, user) {
      if (err) {
         res.json(err)
      } else {
         var mailOptions = {
            from: 'nicander',
            to: user.email,
            subject: 'Authorization for your nicander account',
            text: `You requested us to send you again your password for your account authorization. Your password is ${CryptoJS.AES.decrypt(user.emailPassword, "Secret Passphrase").toString(CryptoJS.enc.Utf8)}`
         };

         transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
               console.log(error);
            } else {
               console.log('Email sent: ' + info.response);
               res.json({
                  msg: "Email sent successfully. Please check your emails inbox (check spam inbox if necessary)."
               })
            }
         });
      }
   })
})

//Forgot password
app.post('/password/forgot', (req, res) => {
   User.findOne({
      email: req.body.email,
      type: req.body.type
   }, function (err, user) {
      if (err) {
         res.json(err)
      } else if (!user) {
         res.json({
            msg: 'This email is not registered!',
            type: 'fail'
         })
      } else {

         const newPassword = CryptoJS.AES.decrypt(makeid(12), "Secret Passphrase").toString();

         bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(newPassword, salt, (err, hash) => {
               if (err) throw err;
               user.password = hash;
               user
                  .save()
                  .then(user => {

                     var mailOptions = {
                        from: 'nicander',
                        to: user.email,
                        subject: 'New account password',
                        text: `You requested us to send you a new password for your account. Your password is ${newPassword}`
                     };

                     transporter.sendMail(mailOptions, function (error, info) {
                        if (error) {
                           console.log(error);
                        } else {
                           console.log('Email sent: ' + info.response);
                           res.json({
                              msg: "Email sent successfully. Please check your emails inbox (check spam inbox if necessary).",
                              type: 'success'
                           })
                        }
                     });

                  })
                  .catch(err => console.log(err));
            });
         });
      }
   })
})

//Vote nicander (user main page)
app.post('/systemVote', (req, res) => {

   SysReview.findOne({
      user_id: req.body.id
   }, function (err, review) {
      if (err) {
         res.json(err)
      } else {
         if (!review) {
            const newSysReview = new SysReview({
               vote: req.body.vote,
               user_id: req.body.id
            })

            newSysReview.save().then(sysReview => {
               res.json({
                  msg: 'Thank you for voting'
               })
            })

         } else if (review) {
            review.vote = req.body.vote;
            review.save()

            res.json({
               msg: 'Your vote has been updated'
            })
         }
      }
   })
})

//get users
app.get('/getUsers', (req, res) => {
   User.find({}, (err, users) => {
      if (err) throw err;
      else {
         res.json(users)
      }
   })
})

//get users
app.get('/getAppointments', (req, res) => {
   Appointment.find({}, (err, appointments) => {
      if (err) throw err;
      else {
         res.json(appointments)
      }
   })
})

//get users
app.get('/getSysReviews', (req, res) => {
   SysReview.find({}, (err, reviews) => {
      if (err) throw err;
      else {
         res.json(reviews)
      }
   })
})

//get emergencies requests
app.get('/getEmergencies/requests', ensureAuthenticated, (req, res) => {
   EmergencyAppointment.find({
      type: 'appointment'
   }, (err, appointments) => {
      if (err) throw err;
      else {
         res.json(appointments)
      }
   })
})

//get 1 emergency appointment
app.post('/getEmergencies/1', ensureAuthenticated, (req, res) => {
   EmergencyAppointment.findOne({
      _id: req.body.appointment_id
   }, (err, appointment) => {
      if (err) throw err;
      else {
         res.json(appointment)
      }
   })
})

//get emergencies completed
app.get('/getEmergencies/completed', ensureAuthenticated, (req, res) => {
   EmergencyAppointment.find({
      type: 'completed'
   }, (err, appointments) => {
      if (err) throw err;
      else {
         res.json(appointments)
      }
   })
})

//get emergencies ignored
app.get('/getEmergencies/ignored', ensureAuthenticated, (req, res) => {
   EmergencyAppointment.find({
      type: 'ignored'
   }, (err, appointments) => {
      if (err) throw err;
      else {
         res.json(appointments)
      }
   })
})

//get emergencies ignored
app.post('/ignoreEmergency', ensureAuthenticated, (req, res) => {
   EmergencyAppointment.findOne({
      _id: req.body.id
   }, (err, appointment) => {
      if (err) throw err;
      else {
         appointment.type = 'ignored'
         appointment.ignored_by = `${req.body.doctor}`
         appointment.save().then(data => {
            res.json({
               msg: 'Emergency appointment ignored'
            })
         })
      }
   })
})

//post adr data
app.post('/adr', (req, res) => {
   console.log(req.body)

   const newAdr = new Adr({
      name: req.body.name,
      surname: req.body.surname,
      gender: req.body.gender,
      dob: req.body.dob,
      reason: req.body.reason,
      advised_by: req.body.advised_by,
      address: req.body.address,
      telephone: req.body.telephone,
      email: req.body.email,
      medicines: req.body.medicines,
      side_effect_start: req.body.side_effect_start,
      side_effect_end: req.body.side_effect_end,
      side_effect_continuing: req.body.side_effect_continuing,
      side_effect_severity: req.body.side_effect_severity,
      side_effect_description: req.body.side_effect_description

   });

   newAdr.save().then(data => {
      res.json({
         msg: 'Adverse reactions report has been sent!'
      });
   })
})

//get ADR reporting forms
app.post('/adr/getReports', (req, res) => {
   Adr.find().sort({ 'date': -1 }).limit(req.body.end).exec(function (err, reports) {
      if (err) {
         console.log(err)
      }
      reports.splice(0, req.body.start)
      res.json(reports)
   })
})

//get ADR reporting forms with criteria
app.post('/adr/getReports/criteria', (req, res) => {
   Adr.find().sort({ 'date': -1 }).exec(function (err, reports) {
      if (err) {
         console.log(err)
      }
      let reportsSend = [];
      console.log(reports.length)
      reports.forEach(report => {
         let includes = true;
         let name = `${decrypt(report.name).toLowerCase()} ${decrypt(report.surname).toLowerCase()}`
         //Date of report
         var reportDate = Date.parse(report.date);
         //req.body.dateFrom

         if (req.body.dateFrom.length > 0) {
            var date_from = Date.parse(req.body.dateFrom);
         } else {
            var date_from = 0;
         }
         if (req.body.dateTo.length > 0) {
            //req.body.dateTo
            var date_to = Date.parse(req.body.dateTo);
         } else {
            var date_to = Date.parse('12/12/9999');
         }

         //full name
         if (!name.includes(req.body.full_name) && req.body.full_name.length > 0) {
            includes = false
         }
         //telephone
         else if (!decrypt(report.telephone).includes(req.body.telephone) && req.body.telephone.length > 0) {
            includes = false
         }
         //severity
         else if (decrypt(report.side_effect_severity).toLowerCase() != req.body.severity && req.body.severity.length > 0) {
            includes = false
         }
         //date from
         else if (reportDate < date_from && req.body.dateFrom.length > 0) {
            includes = false
         }
         //date to
         else if (reportDate > date_to && req.body.dateTo.length > 0) {
            includes = false
         }

         if (includes === true) {
            reportsSend.push(report)
         }
      });
      if (reportsSend.length > req.body.start) {
         console.log(reportsSend.length, 'before splice')
         reportsSend.splice(req.body.end, reportsSend.length - 1)
         reportsSend.splice(0, req.body.start)
         console.log(reportsSend.length, 'after splice')
         res.json(reportsSend)
      } else {
         res.json([])
      }
   })

   function decrypt(encrypted) {
      let decrypted = CryptoJS.AES.decrypt(encrypted, "Secret Passphrase").toString(CryptoJS.enc.Utf8)
      return decrypted
   }
})

//send Email to patient who sent an adr
app.post('/adr/email', function (req, res) {

   var mailOptions = {
      from: 'nicander',
      to: req.body.email,
      subject: `Answer to Adverse Reactions report you sent ${req.body.reportDate}`,
      text: `${req.body.message}`
   };

   transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
         console.log(error);
      } else {
         console.log('Email sent: ' + info.response);
         res.json({
            msg: "Email sent successfully."
         })
      }
   });
})

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
                        if (req.user.emailAuthorized === true) {
                           res.render('dashboard/patient/doctor_profile', {
                              layout: 'dashboard/patient/layout',
                              name: req.user.name,
                              surname: req.user.surname,
                              email: req.user.email,
                              id: req.user._id,
                              prof_id: prof_id,
                              items: items
                           });
                        } else if (req.user.emailAuthorized === false) {
                           res.redirect('/unauthorized')
                        }
                     } else if (req.user.type === 'doctor') {
                        if (req.user.emailAuthorized === true) {
                           res.render('dashboard/doctor/doctor_profile', {
                              layout: 'dashboard/doctor/layout',
                              username: req.user.name,
                              email: req.user.email,
                              id: req.user._id,
                              prof_id: prof_id,
                              items: items
                           });
                        } else if (req.user.emailAuthorized === false) {
                           res.redirect('/unauthorized')
                        }
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
                     res.render('doctor_profile', {
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
               if (req.user.emailAuthorized === true) {
                  res.render('specialties', {
                     layout: 'dashboard/patient/layout',
                     username: req.user.name,
                     email: req.user.email,
                     id: req.user._id,
                     specialty: specialty,
                     items: items
                  })
               } else if (req.user.emailAuthorized === false) {
                  res.redirect('/unauthorized')
               }
            } else if (req.user.type === 'doctor') {
               if (req.user.emailAuthorized === true) {
                  res.render('specialties', {
                     layout: 'dashboard/patient/layout',
                     username: req.user.name,
                     email: req.user.email,
                     id: req.user._id,
                     specialty: specialty,
                     items: items
                  })
               } else if (req.user.emailAuthorized === false) {
                  res.redirect('/unauthorized')
               }
            } else if (req.user.type === 'admin') {
               res.render('specialties', {
                  layout: 'dashboard/admin/layout',
                  username: req.user.name,
                  email: req.user.email,
                  id: req.user._id,
                  specialty: specialty,
                  items: items
               })
            }
         } else {
            res.render('specialties', {
               layout: 'layout.ejs',
               specialty: specialty,
               items: items
            });
         }
      }, 400);
      // res.send(`Page not ready yet \n, ${req.protocol} + :// + ${req.get('host')} + ${req.originalUrl}`)
   }
   else if (req.originalUrl.split(/[/]/)[1] === 'report') {
      if (req.user) {
         if (req.user.type === 'patient') {
            if (req.user.emailAuthorized === true) {
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
            } else if (req.user.emailAuthorized === false) {
               res.redirect('/unauthorized')
            }
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


      app.post(`/appointment/${appointment_id}`, _upload.single('file'), ensureAuthenticated, (req, res) => {
         res.json({ file: req.file });
      })

      //Get all uploaded files
      app.post('/getFiles', ensureAuthenticated, (req, res) => {
         gfs.files.find({ 'metadata.appointment_id': req.body.appointment_id }).toArray((err, files) => {
            // Check if files
            if (!files || files.length === 0) {
               res.json({
                  err: 'No files exist'
               });
            } else {
               // Files exist
               res.json(files);
            }

         });
      });



      if (req.user) {
         if (req.user.type === 'patient') {
            if (req.user.emailAuthorized === true) {
               Appointment.findOne({
                  _id: appointment_id,
                  'patient.id': req.user._id
               }, function (err, appointment) {
                  if (err) {
                     res.send(err)
                  } else {
                     if (appointment) {
                        if (appointment.type === 'appointment') {
                           socketIo()
                           if (appointment.doctor.status === 'offline') {
                              const notification = new Notification({
                                 status: 'unseen',
                                 content: `${appointment.patient.surname} ${appointment.patient.name} has entered the appointment you have on ${appointment.timestamp}`,
                                 user_id: appointment.doctor.id,
                                 href: `/appointment/${appointment._id}`
                              }).save().then(notification => {
                                 true
                              })
                           }
                           res.render('dashboard/patient/appointment', {
                              layout: 'dashboard/patient/layout',
                              username: req.user.name,
                              email: req.user.email,
                              id: req.user._id,
                              appointment_id: appointment_id
                           })
                        } else if (appointment.type === 'completed') {
                           res.render('dashboard/patient/appointment_completed', {
                              layout: 'dashboard/patient/layout',
                              username: req.user.name,
                              email: req.user.email,
                              id: req.user._id,
                              appointment_id: appointment_id
                           })
                        }
                     } else
                        res.render('notFound')
                  }
               })
            } else if (req.user.emailAuthorized === false) {
               res.redirect('/unauthorized')
            }
         } else if (req.user.type === 'doctor') {
            if (req.user.emailAuthorized === true) {
               Appointment.findOne({
                  _id: appointment_id,
                  'doctor.id': req.user._id
               }, function (err, appointment) {
                  if (err) {
                     res.send(err)
                  } else {
                     if (appointment) {
                        if (appointment.type === 'appointment') {
                           socketIo()
                           if (appointment.patient.status === 'offline') {
                              const notification = new Notification({
                                 status: 'unseen',
                                 content: `Dr. ${appointment.doctor.surname} ${appointment.doctor.name} has entered the appointment you have on ${appointment.timestamp}`,
                                 user_id: appointment.patient.id,
                                 href: `/appointment/${appointment._id}`
                              }).save().then(notification => {
                                 true
                              })
                           }

                           res.render('dashboard/doctor/appointment', {
                              layout: 'dashboard/doctor/layout',
                              name: req.user.name,
                              surname: req.user.surname,
                              email: req.user.email,
                              id: req.user._id,
                              appointment_id: appointment_id
                           })
                        } else if (appointment.type === 'completed') {
                           res.render('dashboard/doctor/appointment_completed', {
                              layout: 'dashboard/doctor/layout',
                              username: req.user.name,
                              email: req.user.email,
                              id: req.user._id,
                              appointment_id: appointment_id
                           })
                        }
                     } else
                        res.render('notFound')
                  }
               })
            } else if (req.user.emailAuthorized === false) {
               res.redirect('/unauthorized')
            }
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
                           socket.broadcast.to(appointment.doctor.socket_id).emit('typing', `${appointment.patient.name} ${appointment.patient.surname} is typing...`)
                        }
                        //If he's no longer typing 
                        else {
                           socket.broadcast.to(appointment.doctor.socket_id).emit('typing', ``)
                        }
                     }
                     // Else if doctor sent data that he's typing 
                     else if (data.type === 'doctor') {
                        if (data.typing === true) {
                           socket.broadcast.to(appointment.patient.socket_id).emit('typing', `Dr. ${appointment.doctor.name} ${appointment.doctor.surname} is typing...`)
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

               socket.on('fileUploaded', (data) => {
                  Appointment.findOne({
                     _id: appointment_id,
                  }, function (err, appointment) {
                     if (data.from === 'patient') {
                        socket.broadcast.to(appointment.doctor.socket_id).emit('fileUploaded')
                     } else if (data.from === 'doctor') {
                        socket.broadcast.to(appointment.patient.socket_id).emit('fileUploaded')
                     }
                  })
               })

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
                  }
                  else {
                     socket.emit('SessionActive')
                     socket.emit('CreatePeer')
                  }
                  clients++;
               })

               socket.on('Offer', function (offer) {
                  socket.broadcast.emit("BackOffer", offer)
               })

               socket.on('Answer', function (data) {
                  this.broadcast.emit("BackAnswer", data)
               })

               //Whenever someone disconnects this piece of code executed

               socket.on('disc', (data) => {
                  Appointment.findOne({
                     _id: appointment_id,
                  }, function (err, appointment) {
                     if (data.from === 'patient') {
                        socket.broadcast.to(appointment.patient.socket_id).emit("Disconnect")
                        clients--
                     } else if (data.from === 'doctor') {
                        socket.broadcast.to(appointment.doctor.socket_id).emit("Disconnect")
                        clients--
                     }

                  })
               })

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
                           console.log(err)
                        }
                        if (appointment.patient.timesConnected > 0) {
                           appointment.type = 'completed'
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
                           console.log(err)
                        }
                        if (appointment.doctor.timesConnected > 0) {
                           appointment.type = 'completed'
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
               if (appointment.patient.status === 'online' && appointment.doctor.status === 'online') {
                  appointment.patient.timesConnected++
                  appointment.doctor.timesConnected++
               }
               appointment.save()
               res.json(appointment)
            }
         })


      })
   } else if (req.originalUrl.split(/[/]/)[1] === 'emergency') {

      appointment_id = req.originalUrl.split(/[/]/)[3];

      app.post(`/emergency/appointment/${appointment_id}`, _upload.single('file'), (req, res) => {
         res.json({ file: req.file });
      })

      //Get all uploaded files
      app.post('/getFiles', (req, res) => {
         gfs.files.find({ 'metadata.appointment_id': req.body.appointment_id }).toArray((err, files) => {
            // Check if files
            if (!files || files.length === 0) {
               res.json({
                  err: 'No files exist'
               });
            } else {
               // Files exist
               res.json(files);
            }

         });
      });

      EmergencyAppointment.findOne({
         _id: appointment_id
      }, function (err, appointment) {
         if (err) {
            res.send(err)
         }
         if (appointment && appointment.connectedUsers === 0 && !appointment.patient.socket_id && appointment.type === 'appointment') {

            io.on('connection', function (socket) {
               io.removeAllListeners();

               appointment.connectedUsers++
               appointment.patient.socket_id = socket.id;

               appointment.save()

               socketEvents(socket)
            })

            if (!req.user) {
               res.render('emergency/appointment/emergency-appointment')
            } else {
               res.render('emergency/appointment/emergency-appointment', {
                  layout: 'dashboard/patient/layout',
                  username: req.user.name,
                  email: req.user.email,
                  id: req.user._id
               })
            }
         }
         else if (appointment && appointment.connectedUsers === 1 && req.user.type === 'systemDoctor' && appointment.type === 'appointment') {

            io.on('connection', function (socket) {
               io.removeAllListeners();

               appointment.connectedUsers++
               appointment.doctor = {
                  id: req.user._id,
                  socket_id: socket.id,
                  name: req.user.name,
                  surname: req.user.surname,
                  email: req.user.email
               };

               appointment.save().then(appointment => {
                  socket.broadcast.to(appointment.patient.socket_id).emit('accessChat')

                  socketEvents(socket)
               })
            })

            res.render('dashboard/system-doctor/emergency-appointment', {
               layout: 'dashboard/system-doctor/layout',
               username: req.user.name,
               email: req.user.email,
               id: req.user._id
            })
         }
         else if (appointment.type === 'completed' && req.user.type === 'systemDoctor') {
            res.render('dashboard/system-doctor/appointment_completed', {
               layout: 'dashboard/system-doctor/layout',
               username: req.user.name,
               email: req.user.email,
               id: req.user._id
            })
         }
         else if (appointment.type === 'completed' && req.user.type === 'patient') {
            res.render('dashboard/patient/appointment_emergency_completed', {
               layout: 'dashboard/patient/layout',
               username: req.user.name,
               email: req.user.email,
               id: req.user._id
            })
         }
         else {
            res.render('notFound')
         }
      })

      app.post('/getAppointments/emergency/1', (req, res) => {
         EmergencyAppointment.findOne({
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

   function socketEvents(socket) {
      socket.on('typing', (data) => {
         //We're getting the appointment's data because we need the socket ids of our patient and our doctor
         EmergencyAppointment.findOne({
            _id: appointment_id,
         }, function (err, appointment) {

            // If patient sent data that he's typing
            if (data.type === 'patient') {
               //Then we need to send it to the doctor
               if (data.typing === true) {
                  socket.broadcast.to(appointment.doctor.socket_id).emit('typing', `${appointment.patient.name} ${appointment.patient.surname} is typing...`)
               }
               //If he's no longer typing 
               else {
                  socket.broadcast.to(appointment.doctor.socket_id).emit('typing', ``)
               }
            }
            // Else if doctor sent data that he's typing 
            else if (data.type === 'doctor') {
               if (data.typing === true) {
                  socket.broadcast.to(appointment.patient.socket_id).emit('typing', `Dr. ${appointment.doctor.name} ${appointment.doctor.surname} is typing...`)
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
         EmergencyAppointment.findOne({
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

      socket.on('fileUploaded', (data) => {
         EmergencyAppointment.findOne({
            _id: appointment_id,
         }, function (err, appointment) {
            if (data.from === 'patient') {
               socket.broadcast.to(appointment.doctor.socket_id).emit('fileUploaded')
            } else if (data.from === 'doctor') {
               socket.broadcast.to(appointment.patient.socket_id).emit('fileUploaded')
            }
         })
      })

      socket.on('callEvent', (data) => {
         EmergencyAppointment.findOne({
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
         EmergencyAppointment.findOne({
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
         EmergencyAppointment.findOne({
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
         EmergencyAppointment.findOne({
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
         }
         else {
            socket.emit('SessionActive')
            socket.emit('CreatePeer')
         }
         clients++;
      })

      socket.on('Offer', function (offer) {
         socket.broadcast.emit("BackOffer", offer)
      })

      socket.on('Answer', function (data) {
         this.broadcast.emit("BackAnswer", data)
      })

      socket.on('disconnect', function () {
         if (clients > 0) {
            if (clients <= 2)
               this.broadcast.emit("Disconnect")
            clients--
         }

         if (!req.user) {
            EmergencyAppointment.findOne({
               _id: appointment_id,
            }, function (err, appointment) {
               if (err) {
                  console.log(err)
               }
               if (appointment.connectedUsers > 1) {
                  appointment.type = 'completed'
                  appointment.save()
                  //Send event that patient disconnected
                  socket.broadcast.to(appointment.doctor.socket_id).emit('peerDisconnected', `Patient left`)
               } else {
                  appointment.remove()
               }

            })

         }
         else {
            if (req.user.type === 'patient') {
               EmergencyAppointment.findOne({
                  _id: appointment_id,
               }, function (err, appointment) {
                  if (err) {
                     console.log(err)
                  }

                  if (appointment.connectedUsers > 1) {
                     appointment.type = 'completed'
                     appointment.save()
                     //Send event that patient disconnected
                     socket.broadcast.to(appointment.doctor.socket_id).emit('peerDisconnected', `Patient left`)
                  } else {
                     appointment.remove()
                  }

               })
            }
            else if (req.user.type === 'systemDoctor') {
               EmergencyAppointment.findOne({
                  _id: appointment_id,
               }, function (err, appointment) {
                  if (err) {
                     console.log(err)
                  }
                  appointment.type = 'completed'
                  appointment.save()
                  //Send event that doctor disconnected
                  socket.broadcast.to(appointment.patient.socket_id).emit('peerDisconnected', `Doctor left`)

               })

            }
         }
      })
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