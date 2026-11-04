import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/userSchema.js";

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Connected to MongoDB for admin seeding...");

    const admins = [
      {
        name: "Certificate Administrator",
        email: "admin@sdc.org",
        password: "Admin@12345",
        role: "admin",
      },
      {
        name: "Certificate Admin",
        email: "admin@example.com",
        password: "Admin@12345",
        role: "admin",
      },
    ];

    for (const a of admins) {
      const existing = await User.findOne({ email: a.email });
      if (!existing) {
        const hashedPassword = await bcrypt.hash(a.password, 10);
        await User.create({
          name: a.name,
          email: a.email,
          password: hashedPassword,
          role: a.role,
        });
        console.log(`Created admin account: ${a.email}`);
      } else {
        console.log(`Admin account already exists: ${a.email}`);
      }
    }

    console.log("Admin seeding completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed admin:", error);
    process.exit(1);
  }
};

seedAdmin();
