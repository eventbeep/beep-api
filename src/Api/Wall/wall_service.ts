import { Db, ObjectId } from "mongodb";
import envVars from "../../Config/envconfig";
import { COL } from "../../Mongodb/Collections";
import aws from 'aws-sdk';
import { ObjectIdWithErrorHandler } from "../../Mongodb/helpers";

const fetchWallPosts = async (
    db: Db,
    userId: ObjectId,
    index: number
) => {
    const following: any = await db.collection(COL.Users).findOne(
        { _id: userId },
        { projection: { _id: 0, following: 1 } }
    )

    const posts = await db.collection(COL.Posts).find(
        { createdBy: { $in: following.following } }
    ).sort({ _id: -1 })
}


const createPost = async (
    db: Db,
    body: any,
    userId: ObjectId,
    file: any
) => {
    const post = await db.collection(COL.Posts).insertOne({
        type: 'Post',
        createBy: userId,
        title: body.title,
        likesCount:0,
        likes: [],
        comments: 0
    })
    await db.collection(COL.PostComments).insertOne({
        postId: post.insertedId,
        commentId: 0,
        comments: []
    })

    if (file) {
        const s3 = new aws.S3({
            accessKeyId: envVars.AWS_ACCESS_KEY,
            secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
            signatureVersion: 'v4'
        })
        let fileext: any = file.originalname.split('.')
        fileext = fileext[fileext.length - 1]
        const params = {
            Bucket: 'beepapi',
            Key: post.insertedId.toString() + '.' + fileext,
            Body: file.buffer
        };
        try {
            await new Promise<void>((resolve, reject) => {
                s3.upload(params, function (s3Err: any, data: any) {
                    if (s3Err) {
                        reject({
                            status: 500,
                            code: "Image upload error",
                            message: "Could not  upload the image please try again later."
                        })
                    }
                    else {
                        db.collection(COL.Posts).findOneAndUpdate(
                            { _id: post.insertedId },
                            { $set: { file: post.insertedId.toString() + '.' + fileext } }
                        )
                        resolve()
                    }
                });
            })
        }
        catch (e) {
            throw (e)
        }
    }
}


const createChallenge = async (
    db: Db,
    body: any,
    userId: ObjectId,
    file: any
) => {
    const post = await db.collection(COL.Posts).insertOne({
        type: 'Challenge',
        challengeName: body.challengeName,
        createBy: userId,
        title: body.title,
        likesCount:0,
        likes: [],
        comments: 0
    })
    await db.collection(COL.PostComments).insertOne({
        postId: post.insertedId,
        commentId: 0,
        comments: []
    })

    const existingChallenge = await db.collection(COL.ChallengeInfo).findOne(
        { challengeName: body.challengeName.toLowerCase() },
        { projection: { _id: 1 } }
    )

    if (existingChallenge) {
        await db.collection(COL.ChallengeInfo).findOneAndUpdate(
            { challengeName: body.challengeName.toLowerCase() },
            { $set: { count: 1 } }
        )
    }
    else {
        await db.collection(COL.ChallengeInfo).insertOne(
            {
                challengeName: body.challengeName.toLowerCase(),
                count: 1,
                topPerformer: []
            }
        )
    }

    if (file) {
        const s3 = new aws.S3({
            accessKeyId: envVars.AWS_ACCESS_KEY,
            secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
            signatureVersion: 'v4'
        })
        let fileext: any = file.originalname.split('.')
        fileext = fileext[fileext.length - 1]
        const params = {
            Bucket: 'beepapi',
            Key: post.insertedId.toString() + '.' + fileext,
            Body: file.buffer
        };
        try {
            await new Promise<void>((resolve, reject) => {
                s3.upload(params, function (s3Err: any, data: any) {
                    if (s3Err) {
                        reject({
                            status: 500,
                            code: "Image upload error",
                            message: "Could not  upload the image please try again later."
                        })
                    }
                    else {
                        db.collection(COL.Posts).findOneAndUpdate(
                            { _id: post.insertedId },
                            { $set: { file: post.insertedId.toString() + '.' + fileext } }
                        )
                        resolve()
                    }
                });
            })
        }
        catch (e) {
            throw (e)
        }
    }
}


const deletePost = async(
    db:Db,
    userId:ObjectId,
    postId:ObjectId
)=>{
    const postInfo:any = await db.collection(COL.Posts).findOne(
        {_id:postId},
        {projection: {_id:0, type:1, challengeName:1}}
    )

    await db.collection(COL.Posts).findOneAndDelete({_id:postId})
    await db.collection(COL.PostComments).findOneAndDelete({postId:postId})

    if(postInfo.type === 'Challenge'){
        const challengeInfo:any = await db.collection(COL.ChallengeInfo).findOne({
            challengeName: postInfo.challengeName.toLowerCase()
        })

        if(challengeInfo.count===1){
            await db.collection(COL.ChallengeInfo).findOneAndDelete({_id:challengeInfo._id})
        }
        else{
            let toDelete: any =null
            for( let index=0; index<challengeInfo.topPerformer.length; index++){
                if(challengeInfo.topPerformer[index]['userId'].toString() === userId.toString()){
                    toDelete=challengeInfo.topPerformer[index]
                    break
                }
            }

            if(toDelete){
                let toAdd:any = await db.collection(COL.Posts).find(
                    {type:'Challenge',challengeName: postInfo.challengeName}
                ).sort({likesCount:1}).skip(2).limit(1).toArray()

                await db.collection(COL.ChallengeInfo).updateOne(
                    {_id:challengeInfo._id},
                    {$set : {count : (challengeInfo.count -1)}, $pull: {topPerformer: toDelete}, $push: {topPerformer: 
                        {userId:toAdd.createdBy , likes:toAdd.likesCount }}}
                )
            }

            else{
                await db.collection(COL.ChallengeInfo).updateOne(
                    {_id:challengeInfo._id},
                    {$set : {count : (challengeInfo.count -1)}}
                )
            }
        }
    }
}


const likePost = async(
    db:Db,
    userId:ObjectId,
    postId:ObjectId
)=>{
    const postInfo:any = await db.collection(COL.Posts).findOne(
        {_id:postId},
        {projection: {_id:0, type:1, challengeName:1,likesCount:1}}
    )

    await db.collection(COL.Posts).updateOne(
        {_id:postId},
        {$set:{likesCount:(postInfo.likesCount+1)}, $push:{likes:userId}}
    )

    if(postInfo.type === 'Challenge'){
        const challengeInfo:any = await db.collection(COL.ChallengeInfo).findOne({
            challengeName: postInfo.challengeName.toLowerCase()
        })

        if(challengeInfo.topPerformer.length < 3){
            await db.collection(COL.ChallengeInfo).updateOne(
                {_id:challengeInfo._id},
                {$push: {topPerformer: 
                    {userId:userId , likes:(postInfo.likesCount+1) }}}
            )
        }
        else{
            let toDelete: any =null
            challengeInfo.topPerformer.sort((a:any,b:any)=>{
                return a.likes - b.likes
            })
            for( let index=0; index<challengeInfo.topPerformer.length; index++){
                if(challengeInfo.topPerformer[index]['likes'] < (postInfo.likesCount+1)){
                    toDelete=challengeInfo.topPerformer[index]
                    break
                }
            }

            if(toDelete){
                await db.collection(COL.ChallengeInfo).updateOne(
                    {_id:challengeInfo._id},
                    {$pull: {topPerformer: toDelete}}
                )
                await db.collection(COL.ChallengeInfo).updateOne(
                    {_id:challengeInfo._id},
                    {$push: {topPerformer: 
                        {userId:userId , likes:(postInfo.likesCount+1) }}}
                )
            }
        }
    }
}

const addComment = async(
    db:Db,
    userId:ObjectId,
    body:any
)=>{
    let postComments:any = await db.collection(COL.PostComments).findOne(
        {postId: ObjectIdWithErrorHandler(body.postId)},
        {projection: {commentId:1,_id:1}}
    )

    let postInfo:any  = await db.collection(COL.Posts).findOne(
        {_id: ObjectIdWithErrorHandler(body.postId)},
        {projection:{comments:1}}
    )

    let comment = {
        commentId: (postComments.commentId+1),
        comment: body.comment,
        commentedBy: userId,
        commentThread:[],
        threadId:0
    }

    await db.collection(COL.PostComments).updateOne(
        {_id:postComments._id},
        { $set: {commentId:(postComments.commentId+1)},$push: {comments: comment}}
    )

    await db.collection(COL.Posts).updateOne(
        {_id:ObjectIdWithErrorHandler(body.postId)},
        {$set: {comments:(postInfo.comments+1)}}
    )
}


const editComment = async(
    db:Db,
    userId:ObjectId,
    body:any
)=>{
    let postComments:any = await db.collection(COL.PostComments).findOne(
        {postId: ObjectIdWithErrorHandler(body.postId)},
        {projection: {commentId:1,_id:1,comments:1}}
    )
    let comment = postComments.comments.find((comm:any) => comm.commentId===body.commentId)   
    if(comment.commentedBy.toString()=== userId.toString()){
        await db.collection(COL.PostComments).updateOne(
            {_id:postComments._id},
            {$pull: {comments: comment}}
        ) 
        comment.comment = body.comment
        await db.collection(COL.PostComments).updateOne(
            {_id:postComments._id},
            {$push: {comments: comment}}
        )
        
    }
    else{
        throw({
            status: 400,
            code: "Edit Permission Denied",
            message: "User cannot edit this comment as this was not added by him"
        })
    }
    
}


const deleteComment = async(
    db:Db,
    userId:ObjectId,
    postId:ObjectId,
    commentId:number
)=>{
    let postComments:any = await db.collection(COL.PostComments).findOne(
        {postId: ObjectIdWithErrorHandler(postId)},
        {projection: {commentId:1,_id:1,comments:1}}
    )
    let comment = postComments.comments.find((comm:any) => comm.commentId===commentId)   
    if(comment.commentedBy.toString()=== userId.toString()){
        await db.collection(COL.PostComments).updateOne(
            {_id:postComments._id},
            {$pull: {comments: comment}}
        ) 
        let postInfo:any  = await db.collection(COL.Posts).findOne(
            {_id: ObjectIdWithErrorHandler(postId)},
            {projection:{comments:1}}
        )
        await db.collection(COL.Posts).updateOne(
            {_id:ObjectIdWithErrorHandler(postId)},
            {$set: {comments:(postInfo.comments-1)}}
        )

    }
    else{
        throw({
            status: 400,
            code: "Delete Permission Denied",
            message: "User cannot delte this comment as this was not added by him"
        })
    }
}

const addCommentThread = async(
    db:Db,
    userId:ObjectId,
    body:any
)=>{
    let postComments:any = await db.collection(COL.PostComments).findOne(
        {postId: ObjectIdWithErrorHandler(body.postId)},
        {projection: {commentId:1,_id:1,comments:1}}
    )
    let comment = postComments.comments.find((comm:any) => comm.commentId===body.commentId)    
    let commentThread = {
        commentId: (comment.threadId+1),
        comment: body.comment,
        commentedBy: userId
    }

    await db.collection(COL.PostComments).updateOne(
        {_id:postComments._id},
        {$pull: {comments: comment}}
    )

    comment.threadId=comment.threadId+1
    comment.commentThread.push(commentThread)
    await db.collection(COL.PostComments).updateOne(
        {_id:postComments._id},
        {$push: {comments: comment}}
    )

}

const editCommentThread = async(
    db:Db,
    userId:ObjectId,
    body:any
)=>{
    let postComments:any = await db.collection(COL.PostComments).findOne(
        {postId: ObjectIdWithErrorHandler(body.postId)},
        {projection: {commentId:1,_id:1,comments:1}}
    )
    let comment = postComments.comments.find((comm:any) => comm.commentId===body.commentId)   
    let commentThread = comment.commentThread.find((comm:any)=>comm.commentId===body.threadCommentId)
    if(commentThread.commentedBy.toString()=== userId.toString()){
        
        await db.collection(COL.PostComments).updateOne(
            {_id:postComments._id},
            {$pull: {comments : comment}}
        ) 
        let threadIndex =comment.commentThread.indexOf(commentThread)
        comment.commentThread[threadIndex].comment = body.comment
        await db.collection(COL.PostComments).updateOne(
            {_id:postComments._id},
            {$push: {comments:comment}}
        )
    }
    else{
        throw({
            status: 400,
            code: "Edit Permission Denied",
            message: "User cannot edit this comment Thread as this was not added by him"
        })
    }
    
}


const deleteCommentThread = async(
    db:Db,
    userId:ObjectId,
    postId:ObjectId,
    commentId:number,
    threadCommentId:number
)=>{
    let postComments:any = await db.collection(COL.PostComments).findOne(
        {postId: ObjectIdWithErrorHandler(postId)},
        {projection: {commentId:1,_id:1,comments:1}}
    )
    let comment = postComments.comments.find((comm:any) => comm.commentId===commentId)   
    let commentThread = comment.commentThread.find((comm:any)=>comm.commentId===threadCommentId)
    if(commentThread.commentedBy.toString()=== userId.toString()){
        
        await db.collection(COL.PostComments).updateOne(
            {_id:postComments._id},
            {$pull: {comments : comment}}
        ) 
        let threadIndex =comment.commentThread.indexOf(commentThread)
        comment.commentThread.splice(threadIndex,1)
        await db.collection(COL.PostComments).updateOne(
            {_id:postComments._id},
            {$push: {comments : comment}}
        ) 

    }
    else{
        throw({
            status: 400,
            code: "Delete Permission Denied",
            message: "User cannot edit this comment Thread as this was not added by him"
        })
    }
    
}



export default {
    fetchWallPosts,
    createPost,
    createChallenge,
    deletePost,
    likePost,
    addComment,
    editComment,
    deleteComment,
    addCommentThread,
    editCommentThread,
    deleteCommentThread
}