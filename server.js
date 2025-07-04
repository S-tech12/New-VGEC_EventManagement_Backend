const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const nodemailer = require("nodemailer");
const cloudinaryModule = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require("path");
const PDFDocument = require('pdfkit');
const cron = require("node-cron");
const fs = require('fs');
const { PassThrough } = require('stream');
const getStream = require('get-stream');

const app = express();

app.use(cors({
    origin: "https://new-vgec-event-management-frontend.vercel.app", // Change to your frontend URL
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

cloudinaryModule.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer + Cloudinary setup
const Profilestorage = new CloudinaryStorage({
    cloudinary: cloudinaryModule,
    params: async (req, file) => ({
        folder: 'VGECFest_Portal/profile_pictures',
        public_id: req.user.id,
        allowed_formats: ['jpg', 'png', 'jpeg'],
        overwrite: true,
        resource_type: 'image',
    }),
});

const day = new Date().getDate();

const eventStorage = new CloudinaryStorage({
    cloudinary: cloudinaryModule,
    params: async (req, file) => ({
        folder: 'VGECFest_Portal/events_poster',
        public_id: `${req.user.id}_${day}`,
        allowed_formats: ['jpg', 'png', 'jpeg'],
        overwrite: true,
        resource_type: 'image',
    }),
});

const uploadProfile = multer({ storage: Profilestorage });
const uploadEventPoster = multer({ storage: eventStorage });

mongoose.connect(process.env.MONGO_URI);

let Userschema = mongoose.Schema({
    Userfullname: {
        type: String,
        required: true,
    },
    Usernickname: {
        type: String
    },
    Useremail: {
        type: String,
        required: true
    },
    Username: {
        type: String,
        required: true,
        unique: true
    },
    Userpassword: {
        type: String,
        required: true
    },
    Userrole: {
        type: String,
        enum: ['Student', 'HOD'],
        required: true
    },
    isEventHoster: {
        type: Boolean,
        default: false
    },
    Usercontactno: {
        type: String
    },
    Userbranch: {
        type: String,
        enum: [
            'Information Technology',
            'Computer Science and Engineering',
            'Electronics and Communication',
            'Mechanical Engineering',
            'Civil Engineering',
            'Electrical Engineering',
            'Artificial Intelligence and Data Science',
            'Cyber Security',
            'Biomedical Engineering',
            'Chemical Engineering'
        ]
    },
    Userprofileimage: {
        type: String,
        default: ''
    }
}, { timestamps: true });

let UserCRUD = mongoose.model("UsertableForEventManagment", Userschema);

const EventSchema = mongoose.Schema({
    Event_name: {
        type: String,
        required: true
    },
    Event_hoster_emailid: {
        type: String,
        required: true
    },
    Event_hoster_enrollementNo: {
        type: String,
        required: true
    },
    Event_hoster_ContactNo: {
        type: String,
        required: true
    },
    Event_Status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    Event_hoster_branch: {
        type: String,
        enum: [
            'Information Technology',
            'Computer Science and Engineering',
            'Electronics and Communication',
            'Mechanical Engineering',
            'Civil Engineering',
            'Electrical Engineering'],
    },
    Event_type: {
        type: String,
        enum: [
            'art_and_craft',
            'athletics',
            'dance',
            'Drama',
            'environmentals',
            'gaming',
            'Hackathon',
            'image',
            'music_and_bands',
            'quiz',
            'Seminar',
            'Sing'
        ],
        default: 'Cultural'
    },
    Event_Poster: {
        type: String,
        default: 'default_posters/general.jpg'
    },
    Event_payment: {
        type: String,
        enum: ['Free', 'Paid'],
        default: 'Free'
    },
    Event_feesPerPerson: {
        type: Number,
        min: 1,
        default: null
    },
    Event_description: {
        type: String,
        required: true
    },
    Event_date: {
        type: Date,
        required: true
    },
    from_time: {
        type: String,
        required: true
    },
    to_time: {
        type: String,
        required: true
    },
    Event_location: {
        type: String,
        enum: ['A-Block', 'B-Block', 'C-Block', 'D-Block', 'E-Block',
            'F-Block', 'G-Block', 'H-Block', 'I-Block', 'J-Block',
            'K-Block', 'L-Block', 'M-Block', 'N-Block', 'O-Block',
            'P-Block', 'Q-Block', 'F-Block Ground', 'M-Block Ground'],
        required: true
    },
    Reuired_permission_HOD_emailid: {
        type: String,
        default: null
    },
    Event_completion_status: {
        type: String,
        enum: ['Upcoming', 'Completed'],
        default: "Upcoming"
    },
    Event_hoster_id: {
        type: String,
        required: true
    }
}, { timestamps: true });

let EventCRUD = mongoose.model("EventTable", EventSchema);

let EnrollmentSchema = mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EventTable",
        required: true
    },
    eventName: {
        type: String,
        required: true
    },
    eventType: {
        type: String,
        required: true
    },
    Event_payment: {
        type: String,
        enum: ['Free', 'Paid'],
        default: 'Free'
    },
    eventDate: {
        type: Date,
        required: true
    },
    feesPerPerson: {
        type: Number,
        min: 1,
        default: null
    },
    paidOrNot: {
        type: Boolean,
        default: false
    },
    TransactionRefId: {
        type: String,
    },
    PaymentDate: {
        type: Date
    },
    eventcompletionstatus: {
        type: String,
        required: true
    },
    ParticipantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usertable",
        required: true
    },
    userFullName: {
        type: String,
        required: true
    },
    userEmail: {
        type: String,
        required: true
    },
    userBranch: {
        type: String,
        required: true
    },
    userEnrollmentNo: {
        type: String,
        required: true
    },
    userContactno: {
        type: String,
        required: true
    }
}, { timeStamp: true });

const EnrollmentCRUD = mongoose.model("EventEnrollment", EnrollmentSchema);

let otpStore = {};

app.post("/Signuproute", async (req, res) => {
    try {
        const { Userfullname, Useremailid, Username, Userpassword1, Userrole } = req.body;

        if (!Username || !Userpassword1 || !Userfullname || !Useremailid || !Userrole) return res.status(400).json({ message: "Please fill all the field!!" })


        const existingUser = await UserCRUD.findOne({ Username });
        const checkEmailId = await UserCRUD.findOne({ Useremail: Useremailid });
        const ValidEmailId = Useremailid.endsWith("@vgecg.ac.in");

        if (Userrole === "Student" && !ValidEmailId) return res.status(400).json({ message: "This Website is just useful for the VGEC Student Enter Your College id!!" });
        if (checkEmailId) return res.status(400).json({ message: "EMAIL ALREADY USED!!" });
        if (existingUser) return res.status(400).json({ message: "USERNAME ALREADY USED!!" });

        // ✅ Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000);

        otpStore[Useremailid] = {
            otp,
            data: { Userfullname, Username, Userpassword1, Useremailid, Userrole },
            expiresAt: Date.now() + 10 * 60 * 100
        };

        // ✅ Send Email
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: "220170116050@vgecg.ac.in",
            to: Useremailid,
            subject: "Your OTP for Signup",
            text: `Your OTP is: ${otp}`,
            html: `<div style="font-family: Arial, sans-serif; background-color: #f2f2f2; padding: 20px;">
                    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; padding: 30px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                        <h2 style="color: #004080;">Welcome to VGEC Events!</h2>
                        <p>Thank you for creating an account with us.</p>
                        <p>Your One-Time Password (OTP) is:</p>
                        <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #333; background: #f0f0f0; padding: 10px 20px; border-radius: 8px; text-align: center; width: fit-content; margin: 20px auto;">
                        ${otp}
                        </div>
                        <p style="color : red ; font-size : 22px"><b>This OTP is valid for the next 10 minutes</b>. Please do not share it with anyone.</p>
                        <p style="margin-top: 30px;">Best regards,<br><strong>VGEC Events Team</strong></p>
                      </div>
                    </div>`
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: "OTP sending failed" });
            }

            return res.status(200).json({ message: "OTP sent. Please enter it to complete signup." });
        });
    } catch (err) {
        console.log("ERROR : " + err);
        res.status(500).json({ message: "SERVER ERROR!" });
    }
});

app.post("/verify-otp-signup", async (req, res) => {
    const { email, enteredOtp } = req.body;

    if (!otpStore[email]) {
        return res.status(400).json({ message: "No OTP found. Please sign up again." });
    }

    const { otp, data } = otpStore[email];

    if (Date.now() > otpStore[email].expiresAt) {
        delete otpStore[email];
        return res.status(400).json({ message: "OTP expired" });
    }

    if (parseInt(enteredOtp) !== otp) {
        return res.status(401).json({ message: "Invalid OTP" });
    }

    // ✅ Create user after OTP verification
    const SignUpInstance = new UserCRUD({
        Userfullname: data.Userfullname,
        Username: data.Username,
        Userpassword: data.Userpassword1,
        Useremail: data.Useremailid,
        Userrole: data.Userrole,
        isEventHoster: data.Userrole === 'Student'
    });

    await SignUpInstance.save();

    // ✅ Remove OTP from store
    delete otpStore[email];

    res.status(200).json({ message: "Account created successfully!" });
});


app.post("/Loginroute", async (req, res) => {
    try {
        let { Username, Userpassword1, Userrole } = req.body;

        const UserCheck = await UserCRUD.findOne({ Username: Username });

        if (!UserCheck) {
            return res.status(400).json({ message: "NO ACCOUNT or USERNAME FOUND, PLEASE SIGN UP FIRST!!" })
        }

        if (UserCheck.Userpassword !== Userpassword1) {
            return res.status(400).json({ message: "WRONG PASSWORD!!" });
        }

        if (Userrole === "Event Hoster") {
            if (UserCheck.Userrole === "Student") {
                const token = jwt.sign({ id: UserCheck._id, username: UserCheck.Username, role: "Event Hoster" }, JWT_SECRET, {
                    expiresIn: "1h" // expires in 1 hour
                });

                return res.status(200).json({
                    message: "Login Successfully!!",
                    token: token,
                    role: "Event Hoster"
                });
            } else {
                return res.status(400).json({ message: "THERE IS A MISMATCH OF THE ROLE PLEASE SELECT THE VALID ROLE!!" });
            }
        }
        if (UserCheck.Userrole !== Userrole) {
            return res.status(400).json({ message: "THERE IS A MISMATCH OF THE ROLE PLEASE SELECT THE VALID ROLE!!" });
        }

        const token = jwt.sign({ id: UserCheck._id, username: UserCheck.Username, role: UserCheck.Userrole }, JWT_SECRET, {
            expiresIn: "1h" // expires in 1 hour
        });

        return res.status(200).json({
            message: "LOGIN SUCCESSFULLY!!",
            token: token,
            role: UserCheck.Userrole
        });
    } catch (err) {
        console.log("ERROR : " + err);
        return res.status(500).json({ message: "SERVER ERROR!" });
    }
})

app.post("/SentPasswordRoute", async (req, res) => {
    try {
        let EmailforForgot = req.body.EmailforForgot;
        let nicknameforForgot = req.body.nicknameforForgot;

        const ValidEmailId = await EmailforForgot.endsWith("@vgecg.ac.in");

        if (!ValidEmailId) return res.status(400).json({ message: "This Website is just useful for the VGEC Student Enter Your College id!!" });
        if (nicknameforForgot.length < 4) return res.status(400).json({ message: "The nickname length must be greater than 4" });

        const person = await UserCRUD.findOne({
            Useremail: EmailforForgot
        })

        if (!person) {
            return res.status(400).json({ message: "The entered email id is not exist in the system!!" });
        }

        if (person) {
            if (!person.Usernickname) {
                return res.status(400).json({ message: "There is no any nickname for this account contact to VGEC TechFest team!!\n E-mail-id : 220170116050@vgecg.ac.in" });
            }
        }

        if (person) {
            if (person.Usernickname !== nicknameforForgot) {
                return res.status(400).json({ message: "Wrong nickname please verify it!!" });
            }
        }



        // ✅ Send Email
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: "220170116050@vgecg.ac.in",
            to: EmailforForgot,
            subject: "Your Passowrd for Login",
            text: `Your Password is: ${person.Userpassword}`,
            html: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f4f8; padding: 30px;">
  <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
    
    <h2 style="color: #2c3e50; text-align: center; font-size: 26px;">Forgot Your Password?</h2>
    
    <p style="font-size: 16px; color: #555; line-height: 1.6;">
      Hi there,
    </p>
    
    <p style="font-size: 16px; color: #555; line-height: 1.6;">
      You requested to recover your <strong>VGEC Events</strong> account password. Below is your account information:
    </p>

    <!-- Username Section -->
    <div style="font-size: 22px; font-weight: bold; font-family: 'Courier New', Courier, monospace; color: #1a237e; background-color: #e8f0fe; padding: 14px 24px; text-align: center; border-radius: 10px; margin: 10px auto 20px auto; width: fit-content;">
      Username: ${person.Username}
    </div>

    <!-- Password Section -->
    <div style="font-size: 22px; font-weight: bold; font-family: 'Courier New', Courier, monospace; color: #1a237e; background-color: #e8f0fe; padding: 14px 24px; text-align: center; border-radius: 10px; margin: 10px auto 20px auto; width: fit-content;">
      Password: ${person.Userpassword}
    </div>

    <p style="color: #d32f2f; font-size: 16px; text-align: center; font-weight: 600;">
      Please keep your credentials safe and do not share them with anyone.
    </p>

    <p style="font-size: 14px; color: #757575; margin-top: 20px;">
      If you didn’t request this, please ignore this email. For your security, consider changing your password if you suspect unauthorized access.
    </p>

    <p style="margin-top: 30px; font-size: 16px; color: #555;">
      Regards,<br><strong>VGEC Events Team</strong>
    </p>
  </div>
</div>
`};

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: "Password sending failed" });
            }

            return res.status(200).json({ message: "Password sent. Please enter it to complete Login." });
        });
    } catch (err) {
        console.log("ERROR : " + err);
        res.status(500).json({ message: "SERVER ERROR!" });
    }
})

// aa ek route aapne chatgpt ma thi upadelo che aani andar su thay che ke aapne token ne authenticate kre che and jo token invalid hoy ke missing hoy to tene reject kari nakhe che and jo correct hase to tene next ma java dese 

// Middleware to verify token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Token missing!" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.log("JWT verification failed:", err);
            return res.status(403).json({ message: "Token invalid!" });
        }
        // console.log("JWT decoded payload:", user);
        req.user = user;
        next();
    });
};

// this route is for checking the validate token in the above it is handled the invalid token and for the successfull token there is such a route and here it is 

// it is helpful to redirect the user who are logged in to the dashboard directly
app.get("/verifyToken", authenticateToken, (req, res) => {
    res.status(200).json({ message: "Token is valid", user: req.user });
});


// aa pan aapne upadelo j che aani andar su thay che ke aapne je token malel che teni andar aapne je id rakheli hase tena through aapna database ma thi data ne upadse and than tema thi password ne exculde kari ne tene send kari dese...

// have aa je che te aapna profile folder ni adnar ProfileForStudent/Hod/EventHoster ma jase and than teni andar userData kari ne variable hase teni andar badhu store thai jase and than aapne js ni help thi aapne tene show karvanu che...



// Route to fetch profile
app.get("/getUserProfile", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await UserCRUD.findById(userId);

        if (!user) return res.status(404).json({ message: "User not found!" });

        return res.status(200).json(user);
    } catch (err) {
        console.log("ERROR: " + err);
        return res.status(500).json({ message: "Server error!" });
    }
});

app.put("/updateProfileData", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id; // Retrieved from JWT payload via authenticateToken middleware
        const { Userfullname, Useremail, Username, Userpassword } = req.body;

        // Update the user document
        const updatedUser = await UserCRUD.findByIdAndUpdate(
            userId,
            {
                Userfullname,
                Useremail,
                Username,
                Userpassword,
                updatedAt: new Date() // Manually updating timestamp
            },
            { new: true } // Return the updated document
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found!" });
        }

        res.status(200).json({
            message: "Profile updated successfully!",
            updatedUser
        });
    } catch (err) {
        res.status(500).json({ message: "Error updating Profile!!", ErrorMessage: err.message });
    }
})

app.put("/upload-profile-image", authenticateToken, uploadProfile.single('profileImage'), async (req, res) => {
    try {
        const userId = req.user.id;
        // console.log("Uploaded file info:", req.file);
        const imageUrl = req.file.path;

        // console.log(imageUrl);

        const updatedUser = await UserCRUD.findByIdAndUpdate(
            userId,
            { Userprofileimage: imageUrl },
            { new: true }
        );

        res.json({ success: true, imageUrl: updatedUser.Userprofileimage });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Upload failed' });
    }
})

app.put("/addInfo", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id; // Retrieved from JWT payload via middleware
        const { Usercontactno, Userbranch, Usernickname } = req.body;

        // Server-side validation
        const nicknamePattern = /^[A-Za-z\s]+$/;

        if (!Usercontactno || Usercontactno.length !== 10) {
            return res.status(400).json({
                message: "Invalid Contact Number. Please enter a valid 10-digit contact number."
            });
        }

        if (!Userbranch || Userbranch === "#") {
            return res.status(400).json({
                message: "Branch Missing. Please choose your branch before submitting."
            });
        }

        if (!Usernickname) {
            return res.status(400).json({
                message: "Nickname Missing. Please enter your nickname."
            });
        }

        if (Usernickname.length < 4) {
            return res.status(400).json({
                message: "Nickname Too Short. It should be longer than 4 characters."
            });
        }

        if (!nicknamePattern.test(Usernickname)) {
            return res.status(400).json({
                message: "Invalid Nickname. Only letters and spaces are allowed."
            });
        }

        // Proceed to update the user
        const updatedUser = await UserCRUD.findByIdAndUpdate(
            userId,
            {
                Usercontactno,
                Userbranch,
                Usernickname,
                updatedAt: new Date()
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found!" });
        }

        res.status(200).json({
            message: "Profile updated successfully!",
            updatedUser
        });

    } catch (err) {
        res.status(500).json({
            message: "Error updating profile!",
            error: err.message
        });
    }
});

app.delete("/DeleteAccountForStudent", authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {

        const checkEventForApproved = await EventCRUD.find({
            Event_hoster_id: userId,
            Event_completion_status: "Upcoming",
            Event_Status: "Approved"
        });

        const checkEventForpending = await EventCRUD.find({
            Event_hoster_id: userId,
            Event_completion_status: "Upcoming",
            Event_Status: "Pending"
        });

        if (checkEventForApproved) {
            res.status(400).json({ message: "THERE IS EVENT WHICH IS APPROVED AND NOT DONE SO YOU CAN'T DELETE THE ACCOUNT!!" });
        }

        if (checkEventForpending) {
            res.status(400).json({ message: "THERE IS EVENT WHICH IS PENDING AND NOT DONE SO YOU CAN'T DELETE THE ACCOUNT!!" });
        }

        // this will delete the account
        const result = await UserCRUD.findOneAndDelete({
            _id: userId
        });

        // this will delete the event which is organized by this user
        const result2 = await EventCRUD.deleteMany({
            Event_hoster_id: userId
        })


        if (result) {
            res.status(200).json({ message: "THE ACCOUNT HAS BEEN DELETED!!" });
        } else {
            res.status(400).json({ message: "ERROR TO ACCOUNT BEEN DELETED!!" });
        }
    } catch (err) {
        res.status(400).json({ message: "error to delete the account!!", Error: err });
    }
})

// from here the the routes is about the dashboard for the event_hoster
app.get('/getHodEmails', authenticateToken, async (req, res) => {
    try {
        const hods = await UserCRUD.find({ Userrole: 'HOD' }, 'Userfullname Username Useremail'); // Assuming 'User' model and 'role' field
        const emails = hods.map(hod => ({
            fullname: hod.Userfullname,
            username: hod.Username,
            email: hod.Useremail
        }));
        res.status(200).json(emails);
    } catch (error) {
        res.status(500).json({ message: "Error fetching HOD emails" });
    }
});


// this is the route to add the new event
app.post("/AddEvent", authenticateToken, uploadEventPoster.single("eventPoster"), async (req, res) => {
    const userId = req.user.id;

    try {
        const {
            Event_name,
            Event_hoster_emailid,
            Event_hoster_enrollementNo,
            Event_hoster_ContactNo,
            Event_hoster_branch,
            Event_type,
            Event_payment,
            Event_description,
            Event_date,
            from_time,
            to_time,
            Event_location,
            Reuired_permission_HOD_emailid,
            Event_feesPerPerson
        } = req.body;


        if (Event_payment === "Paid") {
            if ((isNaN(Event_feesPerPerson) || Number(Event_feesPerPerson) <= 1)) {
                return res.status(400).json({ message: "Please fill Correct Amount of Fees per person!" });
            }
        }

        let eventPosterUrl;
        let secureUrlForPoster;

        const eventDateForFilename = Event_date.split("/").slice(0, 2).join("_"); // "15/06/2025" -> "15_06"

        const publicId = `${Event_type}_${eventDateForFilename}`; // e.g. "art_and_craft_15_06"


        if (req.file) {
            // If user uploaded a poster, use the uploaded image URL
            eventPosterUrl = req.file.path;

            // manually upload the actual poster to the cloudinary
            try {
                const cloudinaryResult = await cloudinaryModule.uploader.upload(eventPosterUrl, {
                    public_id: `${publicId}`,
                    folder: "VGECFest_Portal/events_poster",
                    use_filename: true,
                    unique_filename: false
                });
                secureUrlForPoster = cloudinaryResult.secure_url;
            } catch (uploadErr) {
                console.error("Uploaded poster upload to Cloudinary failed:", uploadErr);
                return res.status(500).json({ message: "Failed to upload user poster." });
            }

        } else {
            // If not uploaded, use default image based on Event_type
            eventPosterUrl = path.join(__dirname,
                "default_posters", `${Event_type}.jpg`)

            // manually upload the default poster to the cloudinary
            try {
                const cloudinaryResult = await cloudinaryModule.uploader.upload(eventPosterUrl, {
                    public_id: `${publicId}`,
                    folder: "VGECFest_Portal/events_poster",
                    use_filename: true,
                    unique_filename: false
                });
                secureUrlForPoster = cloudinaryResult.secure_url;
            } catch (uploadErr) {
                console.error("Default poster upload failed:", uploadErr);
                return res.status(500).json({ message: "Failed to upload default poster." });
            }
        }

        const existingEventLocation = await EventCRUD.findOne({
            Event_date,
            Event_location
        })

        const existingEventType = await EventCRUD.findOne({
            Event_date,
            Event_type
        })

        const existingEventHoster = await EventCRUD.findOne({
            Event_date,
            Event_hoster_emailid
        })

        const existingEventBranch = await EventCRUD.findOne({
            Event_hoster_branch,
            Event_date
        })

        const existingEventWithSameName = await EventCRUD.findOne({
            Event_name,
            Event_completion_status: "Upcoming"
        })

        if (existingEventLocation) {
            return res.status(400).json({ message: "ON THIS DAY AND AT THIS LOCATION THE EVENT ALREADY HAS BEEN REGISTERED BY SOMEONE !!" });
        }
        if (existingEventType) {
            return res.status(400).json({ message: "THIS TYPE OF EVENT HAS BEEN EXISTED ON THIS DATE!!" });
        }

        if (existingEventHoster) {
            return res.status(400).json({ message: "YOU CAN ONLY ADD ONE EVENT PER DAY!!" });
        }

        if (existingEventBranch) {
            return res.status(400).json({ message: "ON THIS DAY YOUR BRANCH HAS ALREADY ONE EVENT!!" });
        }

        if (existingEventWithSameName) {
            return res.status(400).json({ message: "THE SAME NAME EVENT ALREADY IN THE LIST SO CHANGE THE NAME OR IF IT IS SAME THAN IT WILL BE REJECTED!!" });
        }


        // this is the extra validation so that the attacker can't modify from the inspect

        if (
            !Event_name ||
            !Event_hoster_emailid ||
            !Event_hoster_enrollementNo ||
            !Event_hoster_ContactNo ||
            !Event_hoster_branch ||
            Event_type === "#" ||
            Event_payment === "#" ||
            !Event_description ||
            !Event_date ||
            Event_location === "#" ||
            Reuired_permission_HOD_emailid === "#"
        ) {
            return res.status(400).json({ message: "Please fill in every required field!" });
        }

        if (!from_time || !to_time) {
            return res.status(400).json({ message: "Please select both From Time and To Time." });
        }

        if (Event_hoster_ContactNo.length != 10) {
            return res.status(400).json({ message: "Enter a valid 10-digit Contact Number." });
        }

        if (Event_description.length <= 20) {
            return res.status(400).json({ message: "Please enter a sufficient Event Description (more than 20 characters)." });
        }

        const Currentdate = new Date();
        const EventDateObj = new Date(Event_date);

        if (Currentdate >= EventDateObj) {
            return res.status(400).json({ message: "PLEASE ENTER A FUTURE EVENT DATE!" });
        }

        let timeDiff = EventDateObj - Currentdate;
        const dayDiff = timeDiff / (1000 * 60 * 60 * 24);
        if (dayDiff <= 15) {
            return res.status(400).json({ message: "YOU CAN ONLY REQUEST FOR THE EVENT AT LEAST 15 DAYS IN ADVANCE!" });
        }

        // from this the time's validation has been strated
        // Convert time strings (e.g., "07:30") to Date objects
        const [startHour, startMin] = from_time.split(":").map(Number);
        const [endHour, endMin] = to_time.split(":").map(Number);

        const today = new Date();
        const startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHour, startMin);
        const endTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endHour, endMin);

        const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 7, 0);  // 07:00
        const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 20, 0);  // 20:00

        // [1] Check if endTime is after startTime
        if (endTime <= startTime) {
            return res.status(400).json({ message: "To Time must be after From Time!" });
        }

        // [2] Check if both times are between 07:00 and 20:00
        if (startTime < dayStart || endTime > dayEnd) {
            return res.status(400).json({ message: "Event timing must be between 7:00 AM and 8:00 PM." });
        }

        // [3] Check if duration is at least 1 hour
        const diffMinutes = (endTime - startTime) / (1000 * 60);
        if (diffMinutes < 60) {
            return res.status(400).json({ message: "The event must be at least 1 hour long!" });
        }

        const EventInstance = new EventCRUD({
            Event_name,
            Event_hoster_emailid,
            Event_hoster_enrollementNo,
            Event_hoster_ContactNo,
            Event_hoster_branch,
            Event_type,
            Event_payment,
            Event_description,
            Event_date,
            from_time,
            to_time,
            Event_location,
            Reuired_permission_HOD_emailid,
            Event_hoster_id: userId,
            Event_Poster: secureUrlForPoster,
            ...(Event_payment === "Paid" && { Event_feesPerPerson: Number(Event_feesPerPerson) }) // 👈 conditionally add this
        });

        await EventInstance.save();

        res.status(200).json({ message: "Event Request has been sucessfully sent!" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Error adding new event please try again later!!" });
    }
})

// this route is used for to show the data in the table like approved events , rejected events , and in the dashboardOfEvent_hoster
app.get("/getEventData", authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await EventCRUD.find({
            Event_hoster_id: userId
        })
        res.status(200).json({ result, message: "EVENT HAS BEEN SUCCESSFULLY FETCHED!!" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Error fetching the event please try again later!!" });
    }
})

// this route is to delete the event from the dashboard's table
app.delete("/Delete-Event", authenticateToken, async (req, res) => {
    const { EventId } = req.body;

    try {
        const event = await EventCRUD.findById(EventId);

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        if (event.Event_Status === "Approved") {
            res.status(400).json({ message: `The event <strong>"${result.Event_name}"</strong> has already been approved and cannot be deleted` })
        }

        await EventCRUD.findByIdAndDelete(EventId);

        return res.status(200).json({ message: `Event "${event.Event_name}" deleted successfully.` })
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Error fetching the event please try again later!!" });
    }
})

// this route will be helpful to show the event hosted by all the event_hoster to student so that they can participate

app.get("/getAllEventDataForParticipate", authenticateToken, async (req, res) => {
    try {

        // Get today's date in 'YYYY-MM-DD' format
        const today = new Date().toISOString().split("T")[0]; // e.g., '2025-06-02'

        const events = await EventCRUD.find({
            Event_Status: "Approved",
            Event_completion_status: "Upcoming"
        });

        // Filter on server-side by comparing only dates (ignoring time)
        const filteredEvents = events.filter(event => {
            const eventDateOnly = new Date(event.Event_date).toISOString().split("T")[0];
            return eventDateOnly > today; // strict comparison (exclude today)
        });

        res.status(200).json(filteredEvents);
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Error fetching the event please try again later!!" });
    }
})


// this are the routes of the Dashboard of the HOD profile page

app.get("/EventForHODDashboardTable", authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const FindHodByTokenId = await UserCRUD.findById(userId)

        if (!FindHodByTokenId) {
            return res.status(404).json({ message: "User not found" });
        }


        const eventRequestedToHOD = await EventCRUD.find({
            Reuired_permission_HOD_emailid: FindHodByTokenId.Useremail,
            Event_Status: "Pending"
        })

        res.status(200).json({ eventRequestedToHOD });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Error fetching the event please try again later!!" });

    }
})

app.put("/Approve-Event", authenticateToken, async (req, res) => {
    try {
        const event = req.body;

        const updatedEvent = await EventCRUD.findByIdAndUpdate(
            event._id,
            { Event_Status: "Approved" },
            { new: true }
        );

        if (!updatedEvent) {
            return res.status(404).json({ message: "Event not found." });
        }

        // ✅ Send Email
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: "220170116050@vgecg.ac.in",
            to: event.Event_hoster_emailid,
            subject: "Your Event has been Approved!",
            html: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f4f8; padding: 30px;">
                    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
                        
                        <h2 style="color: #2e7d32; text-align: center; font-size: 26px;">🎉 Event Approved Successfully!</h2>
                        
                        <p style="font-size: 16px; color: #555; line-height: 1.6;">
                        Hello User,
                        </p>
                        
                        <p style="font-size: 16px; color: #555; line-height: 1.6;">
                        We're happy to inform you that your event <strong>"${event.Event_name}"</strong> scheduled on <strong>${new Date(event.Event_date).toDateString()}</strong> has been <span style="color: #2e7d32; font-weight: bold;">approved</span> by the HOD.
                        </p>

                        <p style="font-size: 16px; color: #444; line-height: 1.6;">
                        ✅ Please ensure all arrangements are made well in advance.<br>
                        📍 Location: <strong>${event.Event_location}</strong><br>
                        🕒 Date: <strong>${new Date(event.Event_date).toDateString()}</strong>
                        </p>

                        <p style="color: #388e3c; font-size: 16px; text-align: center; font-weight: 600;">
                        Best of luck with your event!
                        </p>

                        <p style="font-size: 14px; color: #757575; margin-top: 20px;">
                        For any issues or changes, contact your department head immediately.
                        </p>

                        <p style="margin-top: 30px; font-size: 16px; color: #555;">
                        Regards,<br><strong>VGEC Events Team</strong>
                        </p>
                    </div>
                    </div> `
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.log("Email error:", err);
                return res.status(500).json({
                    message: "Event approved, but failed to send confirmation email.",
                    error: err.toString()
                });
            }

            return res.status(200).json({
                message: "Event approved successfully and email notification sent.",
                updatedEvent
            });
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Error approving the event. Please try again later!" });
    }
})

app.delete("/DeleteAccountForHOD", authenticateToken, async (req, res) => {
    const userId = req.user.id;
    let userEmail = null;

    try {
        const Available = await UserCRUD.findById(userId);

        if (!Available) {
            return res.status(400).json({ message: "USER IS NOT EXIST IN THE SYSTEM!!" });
        }
        userEmail = Available.Useremail;
    } catch (err) {
        return res.status(400).json({ message: "SERVER IS NOT WORKING . TRY AGAIN LATER!!" });
    }

    try {
        const checkEventForApproved = await EventCRUD.find({
            Reuired_permission_HOD_emailid: userEmail,
            Event_completion_status: "Upcoming",
            Event_Status: "Approved"
        });

        // Get all pending events
        const checkEventForpending = await EventCRUD.find({
            Reuired_permission_HOD_emailid: userEmail,
            Event_completion_status: "Upcoming",
            Event_Status: "Pending"
        });

        if (checkEventForApproved.length == 0 && checkEventForpending.length == 0) {

            const result = await UserCRUD.findOneAndDelete({ _id: userId });
            const result2 = await EventCRUD.deleteMany({
                Reuired_permission_HOD_emailid: userEmail,
                Event_completion_status: "Completed"
            });
            const result3 = await EventCRUD.deleteMany({
                Reuired_permission_HOD_emailid: userEmail,
                Event_Status: "Rejected"
            })

            if (result && result2 && result3) {
                return res.status(200).json({ message: "THE ACCOUNT AND ALL THE EVENTS WHICH IS DONE UNDER YOUR APPROVAL HAS SUCCESSFULLY DELETED!!" });
            } else {
                return res.status(400).json({ message: "ERROR TO DELETE THE ACCOUNT!!" });
            }
        }

        if (checkEventForApproved.length > 0) {
            return res.status(400).json({ message: "THERE IS EVENT WHICH IS APPROVED AND NOT DONE SO YOU CAN'T DELETE THE ACCOUNT!!" });
        }

        if (checkEventForpending.length > 0) {

            // Step 1: Group events by host email
            const hostMap = new Map();

            checkEventForpending.forEach(event => {
                const email = event.Event_hoster_emailid;
                if (!hostMap.has(email)) {
                    hostMap.set(email, []);
                }
                hostMap.get(email).push(event);
            });

            // Step 2 :  Create transporter 
            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            let emailErrors = []; // 🆕 Added to collect any email send failures
            for (const [email, events] of hostMap.entries()) {
                const eventBlocks = events.map(event => `
                        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ccc; border-radius: 8px;">
                            <p style="font-size: 16px; color: #444;"><strong>    Event Name:</strong> ${event.Event_name}</p>
                            <p style="font-size: 16px; color: #444;"><strong> 🕒 Date:</strong> ${new Date(event.Event_date).toDateString()}</p>
                            <p style="font-size: 16px; color: #444;"><strong> 📍 Location:</strong> ${event.Event_location}</p>
                        </div>
                        `).join('');

                const mailOptions =
                {
                    from: "220170116050@vgecg.ac.in",
                    to: email,
                    subject: "Event Deleted Due to HOD Account Removal",
                    html: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f4f8; padding: 30px;">
                            <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
                                    
                                <h2 style="color: #d32f2f; text-align: center; font-size: 26px;">⚠️ Events Deleted Notice</h2>
                                
                                <p style="font-size: 16px; color: #555; line-height: 1.6;">
                                Hello User,
                                </p>
                                    
                                <p style="font-size: 16px; color: #555; line-height: 1.6;">
                                We regret to inform you that the following events, previously pending under a now-deleted HOD account, have been <span style="color: #d32f2f; font-weight: bold;">removed from the system</span>:                                    </p>
        
                                ${eventBlocks}
        
                                <p style="font-size: 16px; color: #444; line-height: 1.6;">
                                ❗ You are requested to re-organize these events under the supervision of another HOD as per departmental guidelines.
                                </p>
        
                                <p style="color: #d32f2f; font-size: 16px; text-align: center; font-weight: 600;">
                                We appreciate your cooperation.
                                </p>
        
                                <p style="font-size: 14px; color: #757575; margin-top: 20px;">
                                If you need help, contact your department coordinator or the VGEC Events Team.
                                </p>
    
                                <p style="margin-top: 30px; font-size: 16px; color: #555;">
                                Regards,<br><strong>VGEC Events Team</strong>
                                </p>
                            </div>
                        </div>`
                }

                try {
                    await transporter.sendMail(mailOptions);
                } catch (err) {
                    console.error(`❌ Failed to send email to ${email}:`, err);
                    emailErrors.push({ email, error: err.toString() }); // 🆕 Collect error instead of returning
                }

            }

            // Delete HOD account and related events
            const result = await UserCRUD.findOneAndDelete({ _id: userId });
            const result2 = await EventCRUD.deleteMany({ Reuired_permission_HOD_emailid: userEmail });

            if (result && result2) {
                if (emailErrors.length > 0) {
                    // 🆕 Partial success response
                    return res.status(207).json({
                        message: "HOD and events deleted, but some emails failed to send.",
                        emailErrors
                    });
                }
                // ✅ Success case
                return res.status(200).json({
                    message: "HOD account and events deleted successfully. Notifications sent to all users."
                });
            } else {
                return res.status(500).json({ message: "Failed to delete HOD account or events." });
            }
        }
    } catch (err) {
        res.status(400).json({ message: "error to delete the account!!", Error: err });
    }
})
app.put("/Reject-Event", authenticateToken, async (req, res) => {
    try {
        const event = req.body;

        const updatedEvent = await EventCRUD.findByIdAndUpdate(
            event._id,
            { Event_Status: "Rejected" },
            { new: true }
        );

        if (!updatedEvent) {
            return res.status(404).json({ message: "Event not found." });
        }

        // ✅ Send Email
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: "220170116050@vgecg.ac.in",
            to: event.Event_hoster_emailid,
            subject: "Your Event has been Rejected!",
            html: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff0f0; padding: 30px;">
                    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        
                        <h2 style="color: #c62828; text-align: center; font-size: 26px;">Event Request Rejected</h2>
                        
                        <p style="font-size: 16px; color: #555; line-height: 1.6;">
                        Hello User,
                        </p>
                        
                        <p style="font-size: 16px; color: #555; line-height: 1.6;">
                        We regret to inform you that your event <strong>"${event.Event_name}"</strong> scheduled on <strong>${new Date(event.Event_date).toDateString()}</strong> has been <span style="color: #c62828; font-weight: bold;">rejected</span> by the HOD.
                        </p>

                        <p style="font-size: 16px; color: #444; line-height: 1.6;">
                        If you have any questions or need further assistance, please contact your department head for more details.
                        </p>

                        <p style="color: #d32f2f; font-size: 16px; text-align: center; font-weight: 600;">
                        Please review your event plan and consider resubmitting with any necessary changes.
                        </p>

                        <p style="font-size: 14px; color: #757575; margin-top: 20px;">
                        Thank you for your understanding.
                        </p>

                        <p style="margin-top: 30px; font-size: 16px; color: #555;">
                        Regards,<br><strong>VGEC Events Team</strong>
                        </p>
                    </div>
                    </div> `
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.log("Email error:", err);
                return res.status(500).json({
                    message: "Event rejected, but failed to send confirmation email.",
                    error: err.toString()
                });
            }

            return res.status(200).json({
                message: "Event rejected successfully and email notification sent.",
                updatedEvent
            });
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Error rejecting the event. Please try again later!" });
    }
})


// this are the routes of the HOD profile page
app.get("/ApprovedEventsDataForHODProfile", authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const FindHOD = await UserCRUD.findById(userId);
        const result = await EventCRUD.find({
            Reuired_permission_HOD_emailid: FindHOD.Useremail,
            Event_Status: "Approved",
            Event_completion_status: "Upcoming"
        })
        res.status(200).json({ result, message: "EVENT HAS BEEN SUCCESSFULLY FETCHED!!" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Error fetching the event please try again later!!" });
    }
})

app.get("/RejectedEventsDataForHODProfile", authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const FindHOD = await UserCRUD.findById(userId);
        const result = await EventCRUD.find({
            Reuired_permission_HOD_emailid: FindHOD.Useremail,
            Event_Status: "Rejected",
        })
        res.status(200).json({ result, message: "EVENT HAS BEEN SUCCESSFULLY FETCHED!!" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Error fetching the event please try again later!!" });
    }
})

app.get("/DoneEventsForHodProfile", authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const FindHOD = await UserCRUD.findById(userId);
        const result = await EventCRUD.find({
            Reuired_permission_HOD_emailid: FindHOD.Useremail,
            Event_Status: "Approved",
            Event_completion_status: "Completed"
        })
        res.status(200).json({ result, message: "EVENT HAS BEEN SUCCESSFULLY FETCHED!!" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Error fetching the event please try again later!!" });
    }
})





// from here we have to rearrange the routes

app.post("/QueryrouteForStudent", authenticateToken, async (req, res) => {
    try {
        const { QueryMessage, QuerySubject, QuerySenderMail } = req.body;

        if (!QuerySubject || !QueryMessage || !QuerySenderMail) {
            return res.status(400).json({ message: "Please fill in every field!" });
        }

        const allowedDomain = "@vgecg.ac.in";
        if (!QuerySenderMail.endsWith(allowedDomain)) {
            return res.status(400).json({ message: "This Website is just useful for the VGEC Student Enter Your College id!!" });
        }

        // ✅ Send Email
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: QuerySenderMail,
            to: "220170116050@vgecg.ac.in",
            subject: `Query from Event Portal: ${QuerySubject}`,
            html: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; padding: 30px;">
                    <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">

                        <!-- Header -->
                        <div style="background-color: #007bff; color: white; padding: 20px 30px;">
                        <h2 style="margin: 0;">🎓 [Student Query] - New Submission</h2>
                        </div>

                        <!-- Content -->
                        <div style="padding: 30px;">
                        <p style="font-size: 16px; color: #333;">
                            You’ve received a new <strong>student</strong> query via the VGEC Event Hosting platform.
                        </p>

                        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">

                        <p><strong>📧 Sender Email:</strong> <span style="color: #007bff;">${QuerySenderMail}</span></p>
                        <p><strong>📌 Subject:</strong> <span style="color: #333;">${QuerySubject}</span></p>

                        <div style="margin-top: 20px;">
                            <strong>💬 Message:</strong>
                            <div style="background-color: #f9f9f9; padding: 15px; border-left: 5px solid #007bff; font-style: italic; color: #444; margin-top: 10px; font-size: 20px">
                            ${QueryMessage}
                            </div>
                        </div>

                        <p style="margin-top: 30px; font-size: 14px; color: #888;">This message was sent from a <strong>VGEC student</strong> through the Event Hosting Portal.</p>
                        </div>

                        <!-- Footer -->
                        <div style="background-color: #f1f1f1; padding: 20px; text-align: center; font-size: 13px; color: #999;">
                        &copy; 2025 VGEC Events | All rights reserved.
                        </div>

                    </div>
                    </div>`
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ message: "Your message has been sent successfully!" });

    } catch (err) {
        console.error("Error sending query mail:", err);
        return res.status(500).json({ message: "Server error. Could not send your message. Try again later!" });
    }
})

app.post("/QueryrouteForEvent_hoster", authenticateToken, async (req, res) => {
    try {
        const { QueryMessage, QuerySubject, QuerySenderMail } = req.body;

        if (!QuerySubject || !QueryMessage || !QuerySenderMail) {
            return res.status(400).json({ message: "Please fill in every field!" });
        }

        const allowedDomain = "@vgecg.ac.in";
        if (!QuerySenderMail.endsWith(allowedDomain)) {
            return res.status(400).json({ message: "This Website is just useful for the VGEC Student Enter Your College id!!" });
        }

        // ✅ Send Email
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: QuerySenderMail,
            to: "220170116050@vgecg.ac.in",
            subject: `Query from Event Portal: ${QuerySubject}`,
            html: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; padding: 30px;">
                    <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">

                        <!-- Header -->
                        <div style="background-color: #6f42c1; color: white; padding: 20px 30px;">
                        <h2 style="margin: 0;">🎤 [Event Hoster] - New Query</h2>
                        </div>

                        <!-- Content -->
                        <div style="padding: 30px;">
                        <p style="font-size: 16px; color: #333;">
                            You’ve received a new query from an <strong>event hoster</strong> via the VGEC platform.
                        </p>

                        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">

                        <p><strong>📧 Sender Email:</strong> <span style="color: #6f42c1;">${QuerySenderMail}</span></p>
                        <p><strong>📌 Subject:</strong> <span style="color: #333;">${QuerySubject}</span></p>

                        <div style="margin-top: 20px;">
                            <strong>💬 Message:</strong>
                            <div style="background-color: #f9f9f9; padding: 15px; border-left: 5px solid #6f42c1; font-style: italic; color: #444; margin-top: 10px; font-size: 20px">
                            ${QueryMessage}
                            </div>
                        </div>

                        <p style="margin-top: 30px; font-size: 14px; color: #888;">This message was sent from an <strong>event hoster</strong> through the VGEC Event Hosting Portal.</p>
                        </div>

                        <!-- Footer -->
                        <div style="background-color: #f1f1f1; padding: 20px; text-align: center; font-size: 13px; color: #999;">
                        &copy; 2025 VGEC Events | All rights reserved.
                        </div>

                    </div>
                    </div>`
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ message: "Your message has been sent successfully!" });

    } catch (err) {
        console.error("Error sending query mail:", err);
        return res.status(500).json({ message: "Server error. Could not send your message. Try again later!" });
    }
})

app.post("/QueryrouteForHOD", authenticateToken, async (req, res) => {
    try {
        const { QueryMessage, QuerySubject, QuerySenderMail } = req.body;

        if (!QuerySubject || !QueryMessage || !QuerySenderMail) {
            return res.status(400).json({ message: "Please fill in every field!" });
        }

        const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
        if (!gmailRegex.test(QuerySenderMail)) {
            return res.status(400).json({ message: "Please enter the correct Email-Id" });
        }

        // ✅ Send Email
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: QuerySenderMail,
            to: "220170116050@vgecg.ac.in",
            subject: `Query from Event Portal: ${QuerySubject}`,
            html: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; padding: 30px;">
                    <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">

                        <!-- Header -->
                        <div style="background-color: #218838; color: white; padding: 20px 30px;">
                        <h2 style="margin: 0;">🏫 [HOD Message] - New Query Received</h2>
                        </div>

                        <!-- Content -->
                        <div style="padding: 30px;">
                        <p style="font-size: 16px; color: #333;">
                            A new query has been received from a <strong>Head of Department</strong> via the VGEC Event Hosting Portal.
                        </p>

                        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">

                        <p><strong>📧 Sender Email:</strong> <span style="color: #218838;">${QuerySenderMail}</span></p>
                        <p><strong>📌 Subject:</strong> <span style="color: #333;">${QuerySubject}</span></p>

                        <div style="margin-top: 20px;">
                            <strong>💬 Message:</strong>
                            <div style="background-color: #f9f9f9; padding: 15px; border-left: 5px solid #218838; font-style: italic; color: #444; margin-top: 10px; font-size: 20px">
                            ${QueryMessage}
                            </div>
                        </div>

                        <p style="margin-top: 30px; font-size: 14px; color: #888;">This message was sent by a <strong>VGEC HOD</strong> through the Event Hosting Portal.</p>
                        </div>

                        <!-- Footer -->
                        <div style="background-color: #f1f1f1; padding: 20px; text-align: center; font-size: 13px; color: #999;">
                        &copy; 2025 VGEC Events | All rights reserved.
                        </div>

                    </div>
                    </div>`
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ message: "Your message has been sent successfully!" });

    } catch (err) {
        console.error("Error sending query mail:", err);
        return res.status(500).json({ message: "Server error. Could not send your message. Try again later!" });
    }
})


// from here the student's dashboard participated event process started

// this is the check process to stop student to reenroll in paid event it check that the student is enrolled or not and return the value...

app.post("/check-enrollment", authenticateToken, async (req, res) => {
    const { eventId, userId } = req.body;

    if (!eventId || !userId) {
        return res.status(400).json({ message: "Missing event or user ID" });
    }

    const existing = await EnrollmentCRUD.findOne({
        eventId: eventId,
        ParticipantId: userId
    });

    if (existing) {
        return res.status(200).json({ enrolled: true });
    } else {
        return res.status(200).json({ enrolled: false });
    }
});


// this is the route to stop student to reenroll in free event and if not than they add the data to the backend in the enrollMentCRUD collections...
app.post("/ParticipateStudent", authenticateToken, async (req, res) => {
    const { UserData, event, transactionId } = req.body;

    if (!UserData || !event) {
        return res.status(400).json({ message: "User data or event data missing" });
    }
    try {
        // 1. Prevent duplicate enrollment
        const existing = await EnrollmentCRUD.findOne({
            eventId: event._id,
            ParticipantId: UserData._id
        });

        if (existing) {
            return res.status(400).json({ message: "You are already enrolled in this event." });
        }

        // 2. Check Razorpay transaction validity if event is Paid
        let paymentValid = false;
        if (event.Event_payment === "Paid") {
            if (!transactionId) {
                return res.status(400).json({ message: "Missing payment transaction ID for paid event" });
            }

            // this will check the transactionId is verifiable or not...
            const payment = await razorpay.payments.fetch(transactionId);
            if (!payment || payment.status !== "captured") {
                return res.status(400).json({ message: "Invalid or failed payment" });
            }

            paymentValid = true;
        }

        // 3. Create new enrollment
        const newEnrollment = new EnrollmentCRUD({
            eventId: event._id,
            eventName: event.Event_name,
            eventType: event.Event_type,
            eventDate: event.Event_date,
            Event_payment: event.Event_payment,
            feesPerPerson: event.Event_feesPerPerson,
            eventcompletionstatus: event.Event_completion_status,
            ParticipantId: UserData._id,
            userFullName: UserData.Userfullname,
            userEmail: UserData.Useremail,
            userEnrollmentNo: UserData.Useremail.substring(0, 12),
            userBranch: UserData.Userbranch,
            userContactno: UserData.Usercontactno,
            ...(event.Event_payment === "Paid" && paymentValid ? {
                paidOrNot: true,
                TransactionRefId: transactionId
            } : {}) // 👈 Do not include these fields for Free events
            // above this 4 lines will only execute when the event is paid..
        });

        await newEnrollment.save();

        // 4. Generate PDF receipt (only for paid)
        let receiptBuffer = null;
        if (event.Event_payment === "Paid") {
            // check that the transactionId coming from frontend is actual or not
            const payment = await razorpay.payments.fetch(transactionId);
            if (!payment || payment.status !== "captured") {
                return res.status(400).json({ message: "Invalid or failed payment" });
            }

            // this is the pdf format
            const doc = new PDFDocument({ size: "A4", margin: 50 });
            const passthroughStream = new PassThrough();
            doc.pipe(passthroughStream);

            const pageWidth = doc.page.width;

            // Background
            doc.rect(0, 0, pageWidth, doc.page.height).fill("#f0f8ff");
            doc.fillColor("black");

            // Border
            doc.lineWidth(2).strokeColor("#1f4e79").rect(30, 30, pageWidth - 60, doc.page.height - 60).stroke();

            // College Header
            doc.font("Helvetica-Bold").fontSize(18).fillColor("#1f4e79")
                .text("Vishwakarma Government Engineering College", 0, 50, {
                    align: "center",
                    width: pageWidth,
                });

            doc.font("Helvetica").fontSize(12).fillColor("black")
                .text("Chandkheda, Ahmedabad, Gujarat", 0, doc.y + 2, {
                    align: "center",
                    width: pageWidth,
                });

            // Title
            doc.moveDown(1);
            doc.font("Helvetica-Bold").fontSize(22).fillColor("#005b96")
                .text("FEE RECEIPT", 0, doc.y, {
                    align: "center",
                    width: pageWidth,
                });

            const lineWidth = 200;
            doc.moveTo((pageWidth - lineWidth) / 2, doc.y + 5)
                .lineTo((pageWidth + lineWidth) / 2, doc.y + 5)
                .stroke();

            doc.moveDown(2);

            // Label block drawer
            const drawLabel = (label, value, y) => {
                doc.fillColor("#1f4e79").rect(60, y - 4, 150, 18).fill();
                doc.fillColor("white").font("Helvetica-Bold").fontSize(10).text(label, 65, y);
                doc.fillColor("black").font("Helvetica").text(value, 220, y);
            };

            let y = doc.y;

            // Payment Section
            doc.image("payment.jpg", 60, y, { width: 30, height: 30 });
            doc.font("Helvetica-Bold").fontSize(13).fillColor("#005b96").text("Payment Details", 100, y + 8);
            y += 40;
            const receiptInfo = [
                ["Payment Method:", "RazorPay"],
                ["Transaction ID:", newEnrollment.TransactionRefId],
                ["Amount Paid:", `${newEnrollment.feesPerPerson}`],
                ["Payment Status:", newEnrollment.paidOrNot ? "SUCCESS" : "FAILURE"],
            ];
            receiptInfo.forEach(([label, value]) => {
                drawLabel(label, value, y);
                y += 25;
            });

            y += 5;
            doc.strokeColor("#4CAF50").moveTo(60, y).lineTo(pageWidth - 60, y).stroke();
            y += 30;

            // Student Info
            doc.image("person.jpeg", 60, y, { width: 40, height: 30 });
            doc.font("Helvetica-Bold").fontSize(13).fillColor("#005b96").text("Student Details", 100, y);
            y += 30;

            const studentInfo = [
                ["Full Name:", newEnrollment.userFullName],
                ["Enrollment No:", newEnrollment.userEnrollmentNo],
                ["Email:", newEnrollment.userEmail],
                ["Branch:", newEnrollment.userBranch],
                ["Contact No:", newEnrollment.userContactno],
            ];
            studentInfo.forEach(([label, value]) => {
                doc.fillColor("black").font("Helvetica").fontSize(10).text(`${label} ${value}`, 80, y);
                y += 18;
            });

            y += 5;
            doc.strokeColor("#FF9800").moveTo(60, y).lineTo(pageWidth - 60, y).stroke();
            y += 30;

            // Event Info
            doc.font("Helvetica-Bold").fontSize(13).fillColor("#005b96").text("Event Details", 100, y);
            y += 30;

            doc.image("calendar-icon.jpeg", 60, y, { width: 30, height: 30 });
            y += 40;
            const eventInfo = [
                ["Event Name:", newEnrollment.eventName],
                ["Event Type:", newEnrollment.eventType],
                ["Event Date:", new Date(newEnrollment.eventDate).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                })],
            ];
            eventInfo.forEach(([label, value]) => {
                doc.fillColor("black").font("Helvetica").fontSize(10).text(`${label} ${value}`, 80, y);
                y += 18;
            });

            y += 5;
            doc.strokeColor("#2196F3").moveTo(60, y).lineTo(pageWidth - 60, y).stroke();

            // Footer
            doc.moveDown(5);
            doc.font("Helvetica-Oblique").fontSize(10).fillColor("#1f4e79");
            doc.text("Thank you for registering. Wishing you all the best in the event!", {
                align: "center",
            });

            doc.end();

            // Convert PDF stream to buffer
            receiptBuffer = await getStream.buffer(passthroughStream);
        }

        // 5. Send confirmation email with optional attachment
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: "220170116050@vgecg.ac.in",
            to: UserData.Useremail,
            subject: `Enrollment Confirmed for "${event.Event_name}" – VGEC Events`,
            html: `<div style="font-family: Arial, sans-serif; background-color: #e6f2ff; padding: 20px;">
                    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
                        <h2 style="color: #004080; text-align: center;">🎉 Enrollment Confirmed!</h2>
                        
                        <p style="font-size: 16px; color: #333;">Hello <strong>${UserData.Userfullname}</strong>,</p>
                        
                        <p style="font-size: 16px; color: #333;">
                        Congratulations! You have successfully enrolled in the event <strong style="color: #004080;">${event.Event_name}</strong> organized by VGEC Events.
                        </p>

                        <div style="background-color: #f2f9ff; border: 1px solid #cce0ff; padding: 20px; border-radius: 10px; margin: 20px 0;">
                        <h3 style="color:rgb(10, 12, 14);">📋 Event Details</h3>
                        <p><strong>Event Name:</strong> ${event.Event_name}</p>
                        <p><strong>Event Date:</strong> ${event.Event_date}</p>
                        <p><strong>Venue:</strong> ${event.Event_location}</p>
                        <p><strong>Time:</strong> ${event.from_time} : ${event.to_time}</p>
                        </div>

                        <div style="background-color: #fff8e6; border: 1px solid #ffe0b3; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                        <h3 style="color: #996600;">🙋 Your Information</h3>
                        <p><strong>Name:</strong> ${UserData.Userfullname}</p>
                        <p><strong>Enrollment No:</strong> ${UserData.Useremail.substring(0, 12)}</p>
                        <p><strong>Email:</strong> ${UserData.Useremail}</p>
                        <p><strong>Branch:</strong> ${UserData.Userbranch}</p>
                        </div>

                        <p style="font-size: 16px; color: #444;">
                        Please keep this email for your records. You may be asked to show confirmation during entry. Stay updated for further announcements or instructions regarding the event.
                        </p>

                        <p style="color: #b30000; font-weight: bold; font-size: 16px;">⚠️ Do not share your enrollment details with anyone.</p>

                        <p style="margin-top: 30px; font-size: 16px;">Best wishes,<br><strong style="color: #004080;">VGEC Events Team</strong></p>

                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ccc;">
                        <p style="font-size: 13px; color: #777; text-align: center;">
                        This is an automated message. Please do not reply directly to this email.
                        </p>
                    </div>
                    </div>`,
            attachments: event.Event_payment === "Paid" ? [{
                filename: `FeeReceipt_${event.Event_name}.pdf`,
                content: receiptBuffer,
                contentType: 'application/pdf'
            }] : []
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ message: "OTP sending failed" });
            }

            return res.status(200).json({ message: "Enrollment successful!! Detail has been sent to your registred e-mail!!" });
        });
        res.status(200).json({ message: "Enrollment successful!" });

    } catch (err) {
        console.error("Enrollment error:", err);
        res.status(500).json({ message: "Server error during enrollment" });
    }
})


// this is the route is for the done events table in profile page of student

app.get("/ParticipatedEventsDataForStudentProfile", authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const data = await EnrollmentCRUD.find({
            ParticipantId: userId,
            eventcompletionstatus: "Upcoming"
        });

        res.status(200).json({ data });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Error fetching the data. Please try again later!" });
    }
})

app.get("/DoneEventsDataForStudentProfile", authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const data = await EnrollmentCRUD.find({
            ParticipantId: userId,
            eventcompletionstatus: "Completed"
        });

        res.status(200).json({ data });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Error getting the event. Please try again later!" });
    }
})

// this is the route to fetch the paid and done event data....
app.get("/PaidAndDoneEventsDataForStudentProfile", authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const data = await EnrollmentCRUD.find({
            ParticipantId: userId,
            eventcompletionstatus: { $in: ["Completed", "Upcoming"] },
            Event_payment: "Paid",
            paidOrNot: true
        });

        res.status(200).json({ data });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Error getting the event. Please try again later!" });
    }
})


// now this will generate the pdf file for the event_hoster

// Generate PDF for a specific event
app.get('/generate-pdf/:eventId', async (req, res) => {
    const { eventId } = req.params;

    try {
        const enrollments = await EnrollmentCRUD.find({ eventId });

        let event;
        if (enrollments.length > 0) {
            event = enrollments[0]; // Get event data from the first enrollment
        } else {
            const EventTable = mongoose.model("EventTable"); // Ensure model is registered
            event = await EventTable.findById(eventId);

            if (!event) {
                return res.status(404).send("Event not found.");
            }
        }

        // Prepare PDF
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=Event_Report_${event.eventName.replace(/\s/g, "_")}.pdf`
        );

        doc.pipe(res);

        // Event Header
        doc.fontSize(20).text('Event Enrollment Report', { align: 'center' });
        doc.moveDown();

        // Event Details
        doc.fontSize(14).fillColor('black').text(`Event Details`, { underline: true });
        doc.moveDown(0.5);

        doc.fontSize(12).text(`• Event Name      : ${event.eventName}`);
        doc.text(`• Event Type      : ${event.eventType}`);
        doc.text(`• Event Date      : ${new Date(event.eventDate).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        })}`);
        doc.text(`• Event Status    : ${event.eventcompletionstatus || "Not Specified"}`);
        doc.moveDown();

        // Participant Details
        if (enrollments.length === 0) {
            doc.fontSize(16).fillColor('red').text('No enrollments found for this event.', { align: 'center' });
        } else {
            doc.fontSize(16).fillColor('black').text('Participants:', { underline: true });
            doc.moveDown(0.5);

            enrollments.forEach((p, i) => {
                doc.fontSize(12).fillColor('black');

                doc.text(`${i + 1}) Enrollment No : ${p.userEnrollmentNo}`);
                doc.moveDown(0.2);

                doc.text(`          • Mobile No     : ${p.userContactno || 'N/A'}`);
                doc.moveDown(0.2);

                doc.text(`          • Branch        : ${p.userBranch}`);
                doc.moveDown(0.2);

                doc.text(`          • E-mail ID     : ${p.userEmail}`);
                doc.moveDown(1);  // extra space before the next participant
            });
        }

        // Footer
        doc.moveDown(2);
        doc.fontSize(12).fillColor('gray').text(
            'Regards,\nVGEC Event Management System\n© All rights reserved.',
            { align: 'center' }
        );

        doc.end();

    } catch (err) {
        console.error(err);
        res.status(500).send("Server error generating PDF.");
    }
});


// this is the route for download the certificate
app.get("/downloadCertificate/:eventId", async (req, res) => {
    try {
        const { eventId } = req.params;
        const { userId } = req.query;


        // Step 1: Fetch event and enrollment info
        const event = await EnrollmentCRUD.findById(eventId);

        const actualEvent = await EventCRUD.findOne({
            _id: event.eventId
        });


        // this 2 below line becuase we store the Id as a ObjectId
        const participantObjectId = new mongoose.Types.ObjectId(userId);
        const eventObjectId = new mongoose.Types.ObjectId(eventId);

        if (!event) {
            return res.status(404).json({ message: "Error to find the event. Try again later." });
        }

        // Step 2: Setup response headers
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=Certificate_${event.eventName}.pdf`);

        // Step 3: Create PDF stream
        const doc = new PDFDocument({ size: "A4", margin: 50 });

        // Pipe to response
        doc.pipe(res);

        // Define boundaries
        const pageWidth = doc.page.width; // A4 = ~595
        const leftMargin = 20;
        const rightMargin = pageWidth - 20;

        const topLineY = 70;
        const bottomLineY = 120;
        const centerY = (topLineY + bottomLineY) / 2; // → 95

        // Draw top line
        doc.moveTo(leftMargin, topLineY)
            .lineTo(rightMargin, topLineY)
            .strokeColor("#0a0a3a")
            .lineWidth(1.5)
            .stroke();

        // College name centered between the lines
        doc.font("Helvetica-Bold")
            .fontSize(16)
            .fillColor("#0a0a3a")
            .text("Vishwakarma Government Engineering College, Chandkheda Ahmedabad", 0, centerY - 10, {
                align: "center",
                width: pageWidth, // 545 ensures full width
            });

        // Draw bottom line
        doc.moveTo(leftMargin, bottomLineY)
            .lineTo(rightMargin, bottomLineY)
            .strokeColor("#0a0a3a")
            .lineWidth(1.5)
            .stroke();

        doc.moveDown(2); // Add some space before starting main content

        // Load ribbon image (you can also load background if you have it)
        const ribbonPath = path.join(__dirname, "ribbon.png"); // <- use the ribbon image from your uploads
        if (fs.existsSync(ribbonPath)) {
            doc.image(ribbonPath, 50, 140, { width: 100 });
        }

        // Add certificate content
        doc.font("Helvetica-Bold").fontSize(28).fillColor("#0a0a3a").text("CERTIFICATE", { align: "center" });
        doc.moveDown(0.5);
        doc.font("Helvetica").fontSize(16).fillColor("#3b3b58").text("OF PARTICIPATION", { align: "center" });

        doc.moveDown(1.5);
        doc.font("Helvetica").fontSize(12).fillColor("black").text("This certificate is proudly presented to", { align: "center" });

        doc.moveDown(0.5);
        // Participant Name with underline effect using a line
        doc.font("Times-Italic")
            .fontSize(28)
            .fillColor("#daa520")
            .text(event.userFullName || "Participant", {
                align: "center",
            });

        // Draw underline manually (same width as name text)
        const nameWidth = doc.widthOfString(event.userFullName || "Participant");
        const nameX = (doc.page.width - nameWidth) / 2;
        const nameY = doc.y + 3;

        doc.moveTo(nameX, nameY)
            .lineTo(nameX + nameWidth, nameY)
            .strokeColor("#daa520")
            .lineWidth(1)
            .stroke();

        // Add enrollment number in center just below the name
        doc.moveDown(1);
        doc.font("Helvetica")
            .fontSize(12)
            .fillColor("black")
            .text(`Enrollment No: ${event.userEnrollmentNo || "N/A"}`, {
                align: "center",
            });
        doc.moveDown(1.0);

        // const pageWidth = doc.page.width; // usually 595.28 for A4
        const contentWidth = 460;
        const xPosition = (pageWidth - contentWidth) / 2;
        // Paragraph Text
        doc.font("Helvetica")
            .fontSize(11)
            .fillColor("black")
            .text(
                `For active participation and valuable contribution in the event "${event.eventName}", organized on ${new Date(event.eventDate).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                })}. Your enthusiasm and involvement have significantly contributed to the success of the program.`,
                xPosition, // X-coordinate
                undefined, // Y stays where it is
                {
                    align: "center",
                    width: 460,
                    lineGap: 6,
                }
            );

        doc.moveDown(2);

        // Footer signatures
        const pageHeight = doc.page.height;

        // Event Hoster Email ID
        doc.font("Helvetica-Bold").fontSize(12).text(actualEvent.Event_hoster_emailid, 100, pageHeight - 120, { align: "left" });

        // Underline for Event Hoster Email
        const hosterEmailWidth = doc.widthOfString(actualEvent.Event_hoster_emailid);
        doc.moveTo(100, pageHeight - 108)
            .lineTo(100 + hosterEmailWidth, pageHeight - 108)
            .strokeColor("black")
            .lineWidth(0.5)
            .stroke();

        // Role
        doc.font("Helvetica").fontSize(10).text("Event Hoster", 100, pageHeight - 105, { align: "left" });


        // Mentor Email ID
        doc.font("Helvetica-Bold").fontSize(12).text(actualEvent.Reuired_permission_HOD_emailid, 400, pageHeight - 120, { align: "left" });

        // Underline for Mentor Email
        const hodEmailWidth = doc.widthOfString(actualEvent.Reuired_permission_HOD_emailid);
        doc.moveTo(400, pageHeight - 108)
            .lineTo(400 + hodEmailWidth, pageHeight - 108)
            .strokeColor("black")
            .lineWidth(0.5)
            .stroke();

        // Role
        doc.font("Helvetica").fontSize(10).text("Mentor of Event", 400, pageHeight - 105, { align: "left" });

        doc.end();
    } catch (err) {
        console.error("Certificate generation error:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


// from here the process of the payment is start

const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
    key_id: process.env.KEYID,
    key_secret: process.env.KEYSECRET,
});

app.post("/create-order", async (req, res) => {
    const { amount } = req.body;

    console.log(amount);
    const options = {
        amount: amount * 100, // in paise
        currency: 'INR',
        receipt: `receipt_order_${Date.now()}`,
    };

    try {
        const order = await razorpay.orders.create(options);
        // console.log(order);
        res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create Razorpay order' });
    }
});

// this will update the paidOrNot field
app.post("/mark-paid", async (req, res) => {
    const { eventId, userId, transactionId } = req.body;

    if (!eventId || !userId) {
        return res.status(400).json({ message: "Missing user or event info" });
    }

    try {
        const updated = await EnrollmentCRUD.findOneAndUpdate(
            { eventId: eventId, ParticipantId: userId },
            {
                paidOrNot: true,
                TransactionRefId: transactionId, // optional
            },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ message: "Enrollment not found" });
        }

        res.status(200).json({ message: "Payment marked successfully", data: updated });
    } catch (err) {
        console.error("Error updating payment status:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// this is the route to download the fee reciept
app.get("/downloadFeeReciept/:eventId", async (req, res) => {
    try {
        const { eventId } = req.params;
        const { userId } = req.query;


        // Step 1: Fetch event and enrollment info
        const event = await EnrollmentCRUD.findById(eventId);

        const actualEvent = await EventCRUD.findOne({
            _id: event.eventId
        });

        // this 2 below line becuase we store the Id as a ObjectId
        const participantObjectId = new mongoose.Types.ObjectId(userId);
        const eventObjectId = new mongoose.Types.ObjectId(eventId);

        if (!event) {
            return res.status(404).json({ message: "Error to find the event. Try again later." });
        }

        // Step 2: Setup response headers
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=FeeReceipt_${event.eventName}.pdf`);

        const doc = new PDFDocument({ size: "A4", margin: 50 });
        doc.pipe(res);

        const pageWidth = doc.page.width;

        // Background
        doc.rect(0, 0, pageWidth, doc.page.height).fill("#f0f8ff");
        doc.fillColor("black");

        // Border
        doc.lineWidth(2).strokeColor("#1f4e79").rect(30, 30, pageWidth - 60, doc.page.height - 60).stroke();

        // College Header
        doc.font("Helvetica-Bold").fontSize(18).fillColor("#1f4e79")
            .text("Vishwakarma Government Engineering College", 0, 50, {
                align: "center",
                width: pageWidth,
            });

        doc.font("Helvetica").fontSize(12).fillColor("black")
            .text("Chandkheda, Ahmedabad, Gujarat", 0, doc.y + 2, {
                align: "center",
                width: pageWidth,
            });

        // Title
        doc.moveDown(1);
        doc.font("Helvetica-Bold").fontSize(22).fillColor("#005b96")
            .text("FEE RECEIPT", 0, doc.y, {
                align: "center",
                width: pageWidth,
            });

        // Centered underline
        const lineWidth = 200;
        doc.moveTo((pageWidth - lineWidth) / 2, doc.y + 5)
            .lineTo((pageWidth + lineWidth) / 2, doc.y + 5)
            .stroke();

        doc.moveDown(2);

        // Draw Label Block
        const drawLabel = (label, value, y) => {
            doc.fillColor("#1f4e79").rect(60, y - 4, 150, 18).fill();
            doc.fillColor("white").font("Helvetica-Bold").fontSize(10).text(label, 65, y);
            doc.fillColor("black").font("Helvetica").text(value, 220, y);
        };

        let y = doc.y;

        doc.image("payment.jpg", 60, y, { width: 30, height: 30 });
        doc.font("Helvetica-Bold").fontSize(13).fillColor("#005b96").text("Payment Details", 100, y + 8);
        y += 40;
        const receiptInfo = [
            ["Payment Method:", "RazorPay"],
            ["Transaction ID:", event.TransactionRefId],
            ["Amount Paid:", `${event.feesPerPerson}`],
            ["Payment Status:", event.paidOrNot ? "SUCCESS" : "FAILURE"],
        ];
        receiptInfo.forEach(([label, value]) => {
            drawLabel(label, value, y);
            y += 25;
        });

        // line break;;
        y += 5;
        doc.strokeColor("#4CAF50") // Green
            .moveTo(60, y)
            .lineTo(pageWidth - 60, y)
            .stroke();
        y += 15;

        // Section Title: Student Details
        y += 15;
        doc.image("person.jpeg", 60, y, { width: 40, height: 30 });
        doc.font("Helvetica-Bold").fontSize(13).fillColor("#005b96").text("Student Details", 100, y + 8);
        y += 40;

        const studentInfo = [
            ["Full Name:", event.userFullName],
            ["Enrollment No:", event.userEnrollmentNo],
            ["Email:", event.userEmail],
            ["Branch:", event.userBranch],
            ["Contact No:", event.userContactno],
        ];
        studentInfo.forEach(([label, value]) => {
            doc.fillColor("black").font("Helvetica").fontSize(10).text(`${label} ${value}`, 80, y);
            y += 18;
        });

        // Linebreak;;;
        y += 5;
        doc.strokeColor("#FF9800") // Orange
            .moveTo(60, y)
            .lineTo(pageWidth - 60, y)
            .stroke();
        y += 15;

        // Section Title: Event Details
        y += 15;
        doc.image("calendar-icon.jpeg", 60, y, { width: 30, height: 30 });
        doc.font("Helvetica-Bold").fontSize(13).fillColor("#005b96").text("Event Details", 100, y + 8);
        y += 40;

        const eventInfo = [
            ["Event Name:", event.eventName],
            ["Event Type:", event.eventType],
            ["Event Date:", new Date(event.eventDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "long",
                year: "numeric",
            })],
        ];
        eventInfo.forEach(([label, value]) => {
            doc.fillColor("black").font("Helvetica").fontSize(10).text(`${label} ${value}`, 80, y);
            y += 18;
        });

        // line break
        y += 5;
        doc.strokeColor("#2196F3") // Blue
            .moveTo(60, y)
            .lineTo(pageWidth - 60, y)
            .stroke();
        y += 15;

        doc.moveDown(10); // Add some space before footer if needed
        // Footer
        doc.font("Helvetica-Oblique").fontSize(10).fillColor("#1f4e79");
        doc.text("Thank you for registering. Wishing you all the best in the event!", {
            align: "center",
        });

        doc.end();
    } catch (err) {
        console.error("Certificate generation error:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});



// this will check everyday that the event's date is passed or not if passed than it will change it's status to the Completed.

// ✅ Your auto-update function
async function updatePastEventStatuses() {
    try {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0); // Normalize to 00:00

        const result = await EventCRUD.updateMany(
            {
                Event_date: { $lte: today },
                Event_completion_status: "Upcoming"
            },
            {
                $set: { Event_completion_status: "Completed" }
            }
        );

        const result2 = await EnrollmentCRUD.updateMany(
            {
                eventDate: { $lte: today },
                eventcompletionstatus: "Upcoming"
            },
            {
                $set: { eventcompletionstatus: "Completed" }
            }
        );

        console.log(`${result.modifiedCount} event(s) updated to Completed.`);
        console.log(`${result2.modifiedCount} event(s) updated to Completed.`);
    } catch (err) {
        console.error("Error updating past event statuses:", err);
    }
}

// ✅ Cron job: runs every day at midnight
cron.schedule("0 0 * * *", () => {
    console.log("🕛 Running daily event status update...");
    updatePastEventStatuses();
}, {
    timezone: "Asia/Kolkata"
});


updatePastEventStatuses();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
