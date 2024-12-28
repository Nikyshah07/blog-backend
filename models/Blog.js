import mongoose from "mongoose";
const blogschema=new mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true,
        
    },
    image:{
        type:String,
        required:true,
        
    },
    user:{
        type:mongoose.Types.ObjectId,
        ref:"user",
        required:true
    }
})
export default mongoose.model("blog",blogschema)