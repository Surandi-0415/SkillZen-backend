// backend/controllers/authController.js

const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
};

// REGISTER USER
exports.register = async (req, res) => {
  console.log("📝 Registration request received:", req.body);

  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please provide name, email, and password"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    // Create user (password will be hashed by pre-save hook)
    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password
    });

    user.hashPassword();
    await user.save();

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id)
    });

  } catch (error) {
    console.error("❌ REGISTER ERROR:", error);
    console.error("Error details:", error.message);
    console.error("Stack trace:", error.stack);

    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// LOGIN USER
exports.login = async (req, res) => {
  console.log("📝 Login request received:", req.body.email);

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide email and password"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    // Compare password using callback
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id)
    });

  } catch (error) {
    console.error("❌ LOGIN ERROR:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// GET PROFILE
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    
    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }
    
    res.json(user);
  } catch (error) {
    console.error("❌ PROFILE ERROR:", error);
    res.status(500).json({
      message: "Server error"
    });
  }
};

// UPDATE PROFILE
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, profile, password } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }
    
    if (name) user.name = name;
    if (email) user.email = email;
    if (profile) user.profile = { ...user.profile, ...profile };
    
    // If password is provided, hash it
    if (password && password.length > 0) {
      user.password = bcrypt.hashSync(password, 10);
    }
    
    await user.save();
    
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    console.error("❌ UPDATE PROFILE ERROR:", error);
    res.status(500).json({
      message: "Server error"
    });
  }
};

// ============================================================
// FORGOT PASSWORD
// ============================================================
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  console.log("📝 Forgot password request for email:", email);

  try {
    if (!email) {
      return res.status(400).json({ message: "Please provide an email address" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: "No user found with that email address" });
    }

    // Generate token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Set token hash and expire on user schema
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    await user.save();

    // Create reset URL
    const frontendResetUrl = `http://localhost:5173/reset-password/${resetToken}`;
    console.log(`🔗 RESET LINK FOR TESTING: ${frontendResetUrl}`);

    res.status(200).json({
      success: true,
      message: "Reset link created successfully",
      resetUrl: frontendResetUrl
    });

  } catch (error) {
    console.error("❌ FORGOT PASSWORD ERROR:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};

// ============================================================
// RESET PASSWORD
// ============================================================
exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  console.log("📝 Reset password request with token:", token);

  try {
    if (!password) {
      return res.status(400).json({ message: "Please provide a new password" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    // Get hashed token
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Set new password
    user.password = password;
    user.hashPassword(); // hash password
    
    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successful"
    });

  } catch (error) {
    console.error("❌ RESET PASSWORD ERROR:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
};