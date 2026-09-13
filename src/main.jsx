import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import ReactDOM from 'react-dom/client'
import './index.css'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('home')
  const [posts, setPosts] = useState([])

  //登录表单
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  //发帖表单
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPostAnon, setIsPostAnon] = useState(false)
  //评论
  const [commentText, setCommentText] = useState('')
  const [isCommentAnon, setIsCommentAnon] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState(null)

  //监听登录状态
  useEffect(() => {
    supabase.auth.getSession().then(({ data:{session} }) => {
      setUser(session?.user ?? null)
    })
    const {data} = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return ()=>data.subscription.unsubscribe()
  },[])

  //读取随笔列表
  const fetchPosts = async () => {
    const {data,error} = await supabase
      .from('posts')
      .select(`*, profiles(nickname), comments(*, profiles(nickname))`)
      .order('created_at', {ascending:false})
    if(!error) setPosts(data)
  }
  useEffect(()=>{fetchPosts()},[])

  //注册
  const signUp = async () => {
    const {error} = await supabase.auth.signUp({email,password})
    alert(error ? error.message : '注册成功！直接登录')
  }
  //登录
  const signIn = async () => {
    const {error} = await supabase.auth.signInWithPassword({email,password})
    alert(error ? error.message : '登录成功')
  }
  //登出
  const signOut = async () => {
    await supabase.auth.signOut()
  }

  //发布随笔
  const submitPost = async () => {
    if(!user || !title || !content) return
    const {error} = await supabase.from('posts').insert([{
      user_id:user.id, title, content, is_anonymous:isPostAnon
    }])
    if(!error){
      setTitle('');setContent('');setIsPostAnon(false)
      fetchPosts()
      alert('随笔发布成功')
    }
  }

  //提交评论
  const submitComment = async (postId) => {
    if(!user || !commentText) return
    const {error} = await supabase.from('comments').insert([{
      post_id:postId, user_id:user.id, content:commentText, is_anonymous:isCommentAnon
    }])
    if(!error){
      setCommentText('');setIsCommentAnon(false);setSelectedPostId(null)
      fetchPosts()
    }
  }

  //登录页面
  if(!user){
    return (
      <div className="container">
        <header><h1>文学社随笔平台</h1></header>
        <div className="card">
          <h3>注册 / 登录</h3>
          <input placeholder="邮箱" value={email} onChange={e=>setEmail(e.target.value)} />
          <input placeholder="密码" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <button onClick={signUp}>注册账号</button>
          <button onClick={signIn}>登录</button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <header>
        <h1>文学社随笔平台</h1>
        <p>欢迎你，可匿名发布文字与评论</p>
      </header>
      <div className="nav">
        <button onClick={()=>setPage('home')}>首页随笔流</button>
        <button onClick={()=>setPage('write')}>写随笔</button>
        <button onClick={()=>{setPage('mine');fetchPosts()}}>我的作品</button>
        <button onClick={signOut}>退出登录</button>
      </div>

      {/*写随笔页面*/}
      {page === 'write' && (
        <div className="card">
          <h3>写下你的随笔</h3>
          <input placeholder="标题" value={title} onChange={e=>setTitle(e.target.value)} />
          <textarea placeholder="正文..." value={content} onChange={e=>setContent(e.target.value)} />
          <label><input type="checkbox" checked={isPostAnon} onChange={e=>setIsPostAnon(e.target.checked)} /> 匿名发布这篇随笔</label>
          <button onClick={submitPost}>发布</button>
        </div>
      )}

      {/*首页 / 我的随笔*/}
      {(page==='home' || page==='mine') && posts.map(post=>{
        //我的页面只展示自己的帖子
        if(page==='mine' && post.user_id !== user.id) return null
        const authorName = post.is_anonymous ? '匿名作者' : post.profiles?.nickname
        return (
          <div className="card" key={post.id}>
            <h2>{post.title}</h2>
            <p className="anonymous-tag">作者：{authorName}</p>
            <p style={{margin:'12px 0'}}>{post.content}</p>

            <div className="comment-area">
              <h4>评论</h4>
              {post.comments.map(c=>{
                const cName = c.is_anonymous ? '匿名评论者' : c.profiles?.nickname
                return <p key={c.id}><span className="anonymous-tag">{cName}：</span>{c.content}</p>
              })}
              {selectedPostId === post.id ? (
                <>
                  <textarea placeholder="写下评论..." value={commentText} onChange={e=>setCommentText(e.target.value)}/>
                  <label><input type="checkbox" checked={isCommentAnon} onChange={e=>setIsCommentAnon(e.target.checked)} />匿名评论</label>
                  <button onClick={()=>submitComment(post.id)}>提交评论</button>
                </>
              ) : <button onClick={()=>setSelectedPostId(post.id)}>写评论</button>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
