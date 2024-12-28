import express from 'express'
import mongoose, { mongo } from 'mongoose';
import User from './models/User.js';
import Blog from './models/Blog.js';
import bcrypt from 'bcryptjs'
import cors from 'cors'

import * as dotenv from 'dotenv';

dotenv.config();

const app=express();
app.use(cors())
app.use(express.json())

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



app.post("/sign",async(req,res)=>{
    const {name,email,password}=req.body;
    let existinguser;
    try{
        existinguser=await User.findOne({email})
    }
    catch(err)
    {
       return console.log(err)
    }
    if(existinguser)
    {
        return res.status(400).json({message:"User already exist!"})
    }
    // const hashpassword=bcrypt.hashSync(password)
    const hashpassword =await bcrypt.hash(password, 10); // 10 is a common salt round

    const user=new User({name,email,password:hashpassword,blogs:[]})
    try{
      await  user.save()
    }
    catch(err)
    {
        return console.log(err)
    }
    return res.status(201).json({user})
})


app.post("/login",async(req,res,next)=>{
    const {email,password}=req.body;
    let existinguser;
    try{
        existinguser=await User.findOne({email})
    }
    catch(err)
    {
       return console.log(err)
    }
    if(!existinguser)
    {
        return res.status(404).json({message:"Couldn't find user by this email"})
    }
    const ispasswordcorrect=bcrypt.compareSync(password,existinguser.password)
    if(!ispasswordcorrect)
    {
        return res.status(400).json({message:"Incorrect password"})
    }
    return res.status(200).json({message:"Login successfully",userId: existinguser._id,user:existinguser})
})

app.get('/blog', async (req, res, next) => {
    let blogs; // Use plural to indicate multiple blogs
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


// app.get("/:id",async(req,res,next)=>{
//     const id=req.params.id;
//     let blog;
//     try{
//         blog=await Blog.findById(id)
//     }
//     catch(err)
//     {
//         return console.log(err)
//     }
//     if(!blog)
//         {
//             return res.status(404).json({message:"No blogs found"})
//         }
//         return res.status(200).json({blog})
    
// })


app.get("/:id", async (req, res, next) => {
    const id = req.params.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
    }

    let blog;
    try {
        blog = await Blog.findById(id);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal server error" });
    }

    if (!blog) {
        return res.status(404).json({ message: "No blog found" });
    }
    return res.status(200).json({ blog });
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

app.get('/user/:id',async (req,res,next)=>{
    const userid=req.params.id;
    let userblogs;
    try{
        userblogs=await User.findById(userid).populate("blogs")
    }
    catch(err)
    {
        return console.log(err)
    }
    if(!userblogs)
        {
            return res.status(404).json({message:"No blog found"})
        }
        return res.status(200).json({user:userblogs})
})


app.post("/addblog",async(req,res,next)=>{
const {title,description,image,user}=req.body;
 
let existinguser;
try{
    existinguser=await User.findById(user)
}
catch(err)
{
   return console.log(err)
}
if(!existinguser)
{
    return res.status(404).json({message:"Unable to find user by this id"})
}
const blog=new Blog({
    title,description,image,user
})
try{
    const session=await mongoose.startSession();
    session.startTransaction();

    await blog.save({session})
    existinguser.blogs.push(blog);
    await existinguser.save({session})
    await session.commitTransaction()
}
catch(err)
{
    return console.log(err)
}
return res.status(200).json({blog})
})

app.post('/addblog', async (req, res) => {
    try {
      const { title, description, user,image } = req.body;
       // Get the uploaded file path
  
      const newBlog = new Blog({
        title,
        description,
        image, // Store the path or URL of the uploaded image
        user,
      });
  
      await newBlog.save();
      res.status(201).json({ message: "Blog added successfully", blog: newBlog });
    } catch (error) {
      console.error("Error adding blog:", error);
      res.status(500).json({ message: "Failed to add blog" });
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




// import express from 'express'
// import mongoose, { mongo } from 'mongoose';
// import User from './models/User.js';
// import Blog from './models/Blog.js';
// import bcrypt from 'bcryptjs'
// import cors from 'cors'
// const app=express();
// app.use(cors())
// app.use(express.json())
// mongoose.connect("mongodb+srv://niky:123@cluster0.zinai.mongodb.net/blog")
// app.get('/api',async(req,res,next)=>{
//     let users;
//     try{
//         users=await User.find()
//     }
//     catch(err)
//     {
//         console.log(err)
//     }
//     if(!users)
//     {
//         return res.status(404).json({message:"No user found"})
//     }
//     return res.status(200).json({users})
// })



// app.post("/sign",async(req,res)=>{
//     const {name,email,password}=req.body;
//     let existinguser;
//     try{
//         existinguser=await User.findOne({email})
//     }
//     catch(err)
//     {
//        return console.log(err)
//     }
//     if(existinguser)
//     {
//         return res.status(400).json({message:"User already exist!"})
//     }
//     // const hashpassword=bcrypt.hashSync(password)
//     const hashpassword =await bcrypt.hash(password, 10); // 10 is a common salt round

//     const user=new User({name,email,password:hashpassword,blogs:[]})
//     try{
//       await  user.save()
//     }
//     catch(err)
//     {
//         return console.log(err)
//     }
//     return res.status(201).json({user})
// })


// app.post("/login",async(req,res,next)=>{
//     const {email,password}=req.body;
//     let existinguser;
//     try{
//         existinguser=await User.findOne({email})
//     }
//     catch(err)
//     {
//        return console.log(err)
//     }
//     if(!existinguser)
//     {
//         return res.status(404).json({message:"Couldn't find user by this email"})
//     }
//     const ispasswordcorrect=bcrypt.compareSync(password,existinguser.password)
//     if(!ispasswordcorrect)
//     {
//         return res.status(400).json({message:"Incorrect password"})
//     }
//     return res.status(200).json({message:"Login successfully",userId: existinguser._id,user:existinguser})
// })

// app.get('/blog', async (req, res, next) => {
//     let blogs; // Use plural to indicate multiple blogs
//     try {
//         blogs = await Blog.find().populate("user");
//     } catch (err) {
//         console.log(err);
//         return res.status(500).json({ message: "Internal server error" }); // Handle server error
//     }
    
//     if (!blogs || blogs.length === 0) { // Check if no blogs found
//         return res.status(404).json({ message: "No blogs found" });
//     }
    
//     return res.status(200).json(blogs); // Return blogs directly as an array
// });


// app.get("/:id",async(req,res,next)=>{
//     const id=req.params.id;
//     let blog;
//     try{
//         blog=await Blog.findById(id)
//     }
//     catch(err)
//     {
//         return console.log(err)
//     }
//     if(!blog)
//         {
//             return res.status(404).json({message:"No blogs found"})
//         }
//         return res.status(200).json({blog})
    
// })

// app.delete("/:id",async(req,res,next)=>{
//     const id=req.params.id;
//     let blog;
//     try{
//         blog=await Blog.findByIdAndDelete(id).populate('user')
//         await blog.user.blogs.pull(blog)
//         await blog.user.save()
//     }
//     catch(err)
//     {
//         return console.log(err)
//     }
//     if(!blog)
//         {
//             return res.status(404).json({message:"Unable to delete"})
//         }
//         return res.status(200).json({message:"Deleted successfully"})
    
// })

// app.get('/user/:id',async (req,res,next)=>{
//     const userid=req.params.id;
//     let userblogs;
//     try{
//         userblogs=await User.findById(userid).populate("blogs")
//     }
//     catch(err)
//     {
//         return console.log(err)
//     }
//     if(!userblogs)
//         {
//             return res.status(404).json({message:"No blog found"})
//         }
//         return res.status(200).json({user:userblogs})
// })


// // app.post('/addblog',  async (req, res) => {
// //     try {
// //       const { title, description, user } = req.body;
// //       const {base64}=req.body;
  
// //       const newBlog = new Blog({
// //         title,
// //         description,
    
// //     image, // Store the path or URL of the uploaded image
// //         user,
// //       });
  
// //       await newBlog.save();
// //       res.status(201).json({ message: "Blog added successfully", blog: newBlog });
// //     } catch (error) {
// //       console.error("Error adding blog:", error);
// //       res.status(500).json({ message: "Failed to add blog" });
// //     }
// //   });



// app.post('/addblog', async (req, res) => {
//     try {
//       const { title, description, user, image } = req.body; // Include image in destructuring
  
//       const newBlog = new Blog({
//         title,
//         description,
//         image, // Store base64 image directly
//         user,
//       });
  
//       await newBlog.save();
//       res.status(201).json({ message: "Blog added successfully", blog: newBlog });
//     } catch (error) {
//       console.error("Error adding blog:", error);
//       res.status(500).json({ message: "Failed to add blog" });
//     }
//   });
  

// // app.post("/uploadimage",async(res,req)=>{
// // const {base64}=req.body;
// // try{
// //     User.create({image:base64});
// //     res.send({status:"ok"})

// // }catch(err){
// //     res.send({Status:"error",data:err})
// // }
// // })

// app.put('/update/:id',async(req,res,next)=>{
//     const {title,description}=req.body;
//     const blogid=req.params.id;
//     let blog
//     try{
//     blog=await Blog.findByIdAndUpdate(blogid,{
//         title,description
//     })
//     }catch(err)
//     {
//         console.log(err)
//     }
//     if(!blog)
//     {
//         return res.status(500).json({message:"Unable to update the blog"})
//     }
//     return res.status(200).json({blog})
//     })
    
//     app.use('/',(req,res)=>{
//         res.send("hello")
//     })
//     app.listen(5000,()=>{
//         console.log("Server started")
//     })
    

