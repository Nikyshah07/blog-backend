import express from 'express'
import mongoose, { mongo } from 'mongoose';
import User from './models/User.js';
import Blog from './models/Blog.js';
import bcrypt from 'bcryptjs'
import cors from 'cors'
const app=express();
app.use(cors())
app.use(express.json())
import dotenv from 'dotenv';
dotenv.config();



// mongoose.connect("mongodb+srv://niky:123@cluster0.zinai.mongodb.net/blog")
try{
    const response=await mongoose.connect(`${process.env.URI}`,{ useNewUrlParser: true, useUnifiedTopology: true })
    if(response)
    {
        console.log("Connected to DB")
    }
}
   catch(error){
        console.log(error)
    }

app.get('/api',async(req,res,next)=>{
    let users;
    try{
        users=await User.find()
    }
    catch(err)
    {
        console.log(err)
    }
    if(!users)
    {
        return res.status(404).json({message:"No user found"})
    }
    return res.status(200).json({users})
})

app.post("/sign", async (req, res) => {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    let existinguser;
    try {
        existinguser = await User.findOne({ email });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }

    if (existinguser) {
        return res.status(400).json({ message: "User already exists!" });
    }

    const hashpassword = await bcrypt.hash(password, 10);

    const user = new User({ name, email, password: hashpassword, blogs: [] });
    
    try {
        await user.save();
        return res.status(201).json({ user });
    } catch (err) {
        console.error(err);
        return res.status(400).json({ message: err.message }); // Send back validation error messages
    }
});



app.post("/login", async (req, res) => {
    const { email, password } = req.body;


    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    let existinguser;
    try {
        
        existinguser = await User.findOne({ email });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error" });
    }

    
    if (!existinguser) {
        return res.status(404).json({ message: "Couldn't find user by this email" });
    }

    
    const ispasswordcorrect = bcrypt.compareSync(password, existinguser.password);
    if (!ispasswordcorrect) {
        return res.status(400).json({ message: "Incorrect password" });
    }

    
    return res.status(200).json({
        message: "Login successfully",
        userId: existinguser._id,
        user: existinguser,
    });
});


app.get('/blog', async (req, res, next) => {
    let blogs; 
    try {
        blogs = await Blog.find().populate("user");
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error" }); // Handle server error
    }
    
    if (!blogs || blogs.length === 0) { // Check if no blogs found
        return res.status(404).json({ message: "No blogs found" });
    }
    
    return res.status(200).json(blogs); // Return blogs directly as an array
});


app.get('/:id', async (req, res) => {
    
   const id=req.params.id
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
    }

    try {
        const blog = await Blog.findById(id);
        if (!blog) {
            return res.status(404).json({ message: "Blog not found" });
        }
        return res.status(200).json({ blog });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
});


app.delete("/:id",async(req,res,next)=>{
    const id=req.params.id;
    let blog;
    try{
        blog=await Blog.findByIdAndDelete(id).populate('user')
        await blog.user.blogs.pull(blog)
        await blog.user.save()
    }
    catch(err)
    {
        return console.log(err)
    }
    if(!blog)
        {
            return res.status(404).json({message:"Unable to delete"})
        }
        return res.status(200).json({message:"Deleted successfully"})
    
})
app.get('/user/:id', async (req, res) => {
  const userid = req.params.id;

  try {
    let userblogs = await User.findById(userid).populate("blogs"); // Ensure 'blogs' is populated correctly
    
    if (!userblogs) {
      return res.status(404).json({ message: "No blog found" });
    }

    return res.status(200).json({ user: userblogs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post('/addblog', async (req, res) => {
    const { title, description, image, user } = req.body;
  
    try {
      // Create a new blog post
      const newBlog = new Blog({
        title,
        description,
        image,
        user: user // Associate the blog with the user ID
      });
  
      // Save the blog post to the database
      await newBlog.save();
  
      // Find the user and update their blogs array
      await User.findByIdAndUpdate(user, { $push: { blogs: newBlog._id } }); // Push the new blog ID into the user's blogs array
  
      return res.status(201).json({ message: "Blog added successfully", blog: newBlog });
    } catch (error) {
      console.error("Error adding blog:", error);
      return res.status(500).json({ message: "Failed to add blog" });
    }
  });


app.put('/update/:id',async(req,res,next)=>{
const {title,description}=req.body;
const blogid=req.params.id;
let blog
try{
blog=await Blog.findByIdAndUpdate(blogid,{
    title,description
})
}catch(err)
{
    console.log(err)
}
if(!blog)
{
    return res.status(500).json({message:"Unable to update the blog"})
}
return res.status(200).json({blog})
})

app.use('/',(req,res)=>{
    res.send("hello")
})
app.listen(`${process.env.PORT}`,()=>{
    console.log("Server started")
})