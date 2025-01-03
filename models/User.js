import mongoose from "mongoose";
const userschema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
        
    },
    image:{
        type:String
    },
    blogs:[
        {
            type:mongoose.Types.ObjectId,
            ref:"blog",
            required:true
        }
    ]
})
export default mongoose.model("user",userschema)