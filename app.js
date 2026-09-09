
(() => {
  const QUESTIONS = window.QUIZ_QUESTIONS || [];
  const CATEGORIES = window.QUIZ_CATEGORIES || [];
  const STORAGE_KEY = 'wwtp_maintenance_reduction_quiz_v1';
  const LETTERS = ['A','B','C','D'];
  const advice = {
    '管網、人孔與管渠維護':'加強人孔設置間距、管渠巡檢頻率、CCTV／錯接調查、腐蝕判定及修繕／更生／改建工法的適用情境。',
    '局限空間、職安與法規':'加強局限空間定義、進入許可、通風與氣體濃度、危害防止計畫，以及作業環境監測頻率。',
    '處理單元操作與異常診斷':'加強初沉池、二沉池、生物池、污泥濃縮與放流水等單元的異常現象、原因判讀與改善方向。',
    '設備維護、儀表與機電':'加強儀表校正週期、RATA、預測／預防維護、健全度分級、電氣人員與設備點檢管理。',
    '再生水法規、水質與水資源':'加強再生水定義、主管機關、法規要求、水質限值、用途限制與臺灣水資源概況。',
    '再生水處理技術與薄膜消毒':'加強 MF／UF／NF／RO 分離範圍、消毒方式，以及不同污染物對應的再生水處理單元。',
    '製程減量、用水盤點與回收':'加強源頭減量策略、用水／排水盤點、循環水與回收水定義、工業用水分類與回收策略。',
    '污泥減量、處理與資源化':'加強污泥含水型態、污泥齡、污泥水解、混凝減量、濃縮脫水乾燥，以及好氧／厭氧污泥產生率。'
  };

  const $ = id => document.getElementById(id);
  const els = {
    homeView:$('homeView'), quizView:$('quizView'), resultView:$('resultView'),
    startBtn:$('startBtn'), resumeBtn:$('resumeBtn'), homeBtn:$('homeBtn'),
    totalCount:$('totalCount'), masteredCount:$('masteredCount'), wrongCount:$('wrongCount'), remainingCount:$('remainingCount'), masteryPct:$('masteryPct'), progressRing:$('progressRing'),
    categoryGrid:$('categoryGrid'), historyBox:$('historyBox'), exportBtn:$('exportBtn'), importInput:$('importInput'), resetBtn:$('resetBtn'),
    quizCategory:$('quizCategory'), questionPosition:$('questionPosition'), answeredCount:$('answeredCount'), quizProgressBar:$('quizProgressBar'), sourceLabel:$('sourceLabel'), wrongBadge:$('wrongBadge'), questionText:$('questionText'), optionsBox:$('optionsBox'), prevBtn:$('prevBtn'), nextBtn:$('nextBtn'), questionPalette:$('questionPalette'), submitBtn:$('submitBtn'),
    scoreText:$('scoreText'), resultTitle:$('resultTitle'), correctResult:$('correctResult'), wrongResult:$('wrongResult'), totalResult:$('totalResult'), weaknessBox:$('weaknessBox'), reviewList:$('reviewList'), nextQuizBtn:$('nextQuizBtn')
  };

  function blankState(){
    const stats={}; CATEGORIES.forEach(c=>stats[c]={attempts:0,correct:0});
    return {version:1,mastered:[],wrong:[],stats,history:[],currentQuiz:null};
  }
  function loadState(){
    try{
      const s=JSON.parse(localStorage.getItem(STORAGE_KEY));
      if(!s || s.version!==1) return blankState();
      s.mastered=Array.isArray(s.mastered)?s.mastered:[]; s.wrong=Array.isArray(s.wrong)?s.wrong:[]; s.history=Array.isArray(s.history)?s.history:[]; s.stats=s.stats||{};
      CATEGORIES.forEach(c=>{if(!s.stats[c])s.stats[c]={attempts:0,correct:0};});
      return s;
    }catch(e){return blankState();}
  }
  let state=loadState();
  let currentIndex=0;
  let lastResult=null;
  const qMap=new Map(QUESTIONS.map(q=>[q.id,q]));
  const uniq=a=>[...new Set(a)];
  function save(){state.mastered=uniq(state.mastered);state.wrong=uniq(state.wrong).filter(id=>!state.mastered.includes(id));localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
  function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
  function formatText(t){
    if(!t)return '';
    return t.replace(/\$([^$]+)\$/g,'$1').replace(/\\text\{([^}]+)\}/g,'$1').replace(/\\mu/g,'μ').replace(/\\rightarrow/g,'→').replace(/\\,/g,'').replace(/\^\\circ/g,'°').replace(/\^\{?3\}?/g,'³').replace(/_\{?5\}?/g,'₅').replace(/_\{?4\}?/g,'₄').replace(/_\{?3\}?/g,'₃').replace(/_\{?2\}?/g,'₂').replace(/\^\+/g,'⁺').replace(/\^-/g,'⁻');
  }
  function masteredSet(){return new Set(state.mastered)}
  function wrongSet(){return new Set(state.wrong)}

  function updateDashboard(){
    const m=masteredSet(), w=wrongSet();
    els.totalCount.textContent=QUESTIONS.length; els.masteredCount.textContent=m.size; els.wrongCount.textContent=w.size; els.remainingCount.textContent=QUESTIONS.length-m.size;
    const pct=Math.round(m.size/QUESTIONS.length*100); els.masteryPct.textContent=pct+'%'; els.progressRing.style.setProperty('--pct',(pct*3.6)+'deg');
    els.resumeBtn.classList.toggle('hidden',!state.currentQuiz);
    els.categoryGrid.innerHTML='';
    CATEGORIES.forEach(c=>{
      const all=QUESTIONS.filter(q=>q.category===c), cm=all.filter(q=>m.has(q.id)).length, cw=all.filter(q=>w.has(q.id)).length, cp=Math.round(cm/all.length*100);
      const d=document.createElement('div'); d.className='category-item'; d.innerHTML=`<div class="category-top"><span class="category-name">${c}</span><span class="category-num">${cm}/${all.length}</span></div><div class="mini-track"><span style="width:${cp}%"></span></div><small>掌握 ${cp}% ・ 錯題 ${cw} 題</small>`; els.categoryGrid.appendChild(d);
    });
    if(!state.history.length){els.historyBox.className='history-box empty';els.historyBox.textContent='尚無測驗紀錄。';}
    else{els.historyBox.className='history-box';els.historyBox.innerHTML=state.history.slice(0,6).map(h=>`<div class="history-row"><span>${h.date}</span><strong>${h.score} 分</strong><span>${h.correct}/${h.total} 題</span></div>`).join('');}
  }

  function pickFromCategory(arr,n,wset){
    if(arr.length<=n)return shuffle(arr);
    const wrong=shuffle(arr.filter(q=>wset.has(q.id))), fresh=shuffle(arr.filter(q=>!wset.has(q.id)));
    const reviewTarget=Math.min(wrong.length,Math.ceil(n/2));
    let chosen=wrong.slice(0,reviewTarget); chosen.push(...fresh.slice(0,n-chosen.length));
    if(chosen.length<n) chosen.push(...wrong.slice(reviewTarget,reviewTarget+(n-chosen.length)));
    return chosen;
  }
  function buildQuiz(){
    const m=masteredSet(), w=wrongSet();
    const available=QUESTIONS.filter(q=>!m.has(q.id));
    if(!available.length){alert('恭喜！297 題已全部答對並列為已掌握。若要重新練習，可在首頁重設全部進度。');return false;}
    const target=Math.min(40,available.length); let selected=[];
    CATEGORIES.forEach(c=>{const arr=available.filter(q=>q.category===c);selected.push(...pickFromCategory(arr,Math.min(5,arr.length),w));});
    selected=uniq(selected.map(q=>q.id)).map(id=>qMap.get(id));
    if(selected.length>target) selected=shuffle(selected).slice(0,target);
    if(selected.length<target){const used=new Set(selected.map(q=>q.id));const rest=available.filter(q=>!used.has(q.id)); const extra=pickFromCategory(rest,target-selected.length,w);selected.push(...extra);}
    selected=shuffle(selected).slice(0,target);
    state.currentQuiz={ids:selected.map(q=>q.id),answers:{},startedAt:new Date().toISOString()}; currentIndex=0; save(); return true;
  }

  function showView(name){
    ['homeView','quizView','resultView'].forEach(k=>els[k].classList.remove('active'));
    els[name].classList.add('active'); document.body.classList.toggle('quiz-active',name==='quizView');document.body.classList.toggle('result-active',name==='resultView');window.scrollTo({top:0,behavior:'smooth'});
  }
  function startNew(){
    if(state.currentQuiz && !confirm('目前有尚未交卷的測驗。要放棄該回並重新抽題嗎？'))return;
    state.currentQuiz=null; if(buildQuiz()){renderQuiz();showView('quizView');}
  }
  function resume(){if(!state.currentQuiz)return;currentIndex=0;renderQuiz();showView('quizView');}
  function currentQuestions(){return state.currentQuiz?state.currentQuiz.ids.map(id=>qMap.get(id)).filter(Boolean):[];}
  function renderQuiz(){
    const list=currentQuestions(); if(!list.length){state.currentQuiz=null;save();showView('homeView');updateDashboard();return;}
    currentIndex=Math.max(0,Math.min(currentIndex,list.length-1));const q=list[currentIndex];const answers=state.currentQuiz.answers||{};const ans=answers[q.id];
    els.quizCategory.textContent=q.category;els.questionPosition.textContent=`第 ${currentIndex+1} / ${list.length} 題`;const ac=Object.keys(answers).length;els.answeredCount.textContent=`已作答 ${ac} / ${list.length}`;els.quizProgressBar.style.width=((currentIndex+1)/list.length*100)+'%';els.sourceLabel.textContent=q.sourceLabel+'｜'+q.partTitle;els.wrongBadge.classList.toggle('hidden',!wrongSet().has(q.id));els.questionText.textContent=formatText(q.question);
    els.optionsBox.innerHTML='';q.options.forEach((opt,i)=>{const b=document.createElement('button');b.type='button';b.className='option-btn'+(ans===i?' selected':'');b.innerHTML=`<span class="option-letter">${LETTERS[i]}</span><span>${formatText(opt)}</span>`;b.onclick=()=>{state.currentQuiz.answers[q.id]=i;save();renderQuiz();};els.optionsBox.appendChild(b);});
    els.prevBtn.disabled=currentIndex===0;els.prevBtn.style.opacity=currentIndex===0?'.45':'1';els.nextBtn.textContent=currentIndex===list.length-1?'回到題號導覽':'下一題';
    els.questionPalette.innerHTML='';list.forEach((x,i)=>{const b=document.createElement('button');b.type='button';b.className='q-dot'+(answers[x.id]!==undefined?' answered':'')+(i===currentIndex?' current':'');b.textContent=i+1;b.onclick=()=>{currentIndex=i;renderQuiz();window.scrollTo({top:0,behavior:'smooth'});};els.questionPalette.appendChild(b);});
  }
  els.prevBtn.onclick=()=>{if(currentIndex>0){currentIndex--;renderQuiz();}};
  els.nextBtn.onclick=()=>{const list=currentQuestions();if(currentIndex<list.length-1){currentIndex++;renderQuiz();}else document.querySelector('.palette-card').scrollIntoView({behavior:'smooth'});};

  function submitQuiz(){
    const list=currentQuestions();if(!list.length)return;const answers=state.currentQuiz.answers||{};const unanswered=list.filter(q=>answers[q.id]===undefined).length;if(unanswered && !confirm(`尚有 ${unanswered} 題未作答。未作答將視為答錯並加入錯題池，仍要交卷嗎？`))return;
    const m=masteredSet(), w=wrongSet();let correct=0;const review=[];const roundStats={};CATEGORIES.forEach(c=>roundStats[c]={total:0,correct:0,wrongIds:[]});
    list.forEach(q=>{const user=answers[q.id];const ok=user===q.answerIndex;roundStats[q.category].total++;state.stats[q.category].attempts++;if(ok){correct++;roundStats[q.category].correct++;state.stats[q.category].correct++;m.add(q.id);w.delete(q.id);}else{w.add(q.id);roundStats[q.category].wrongIds.push(q.id);}review.push({q,user,ok});});
    state.mastered=[...m];state.wrong=[...w].filter(id=>!m.has(id));const score=Math.round(correct/list.length*100);const now=new Date();const date=now.toLocaleString('zh-TW',{hour12:false});state.history.unshift({date,score,correct,total:list.length});state.history=state.history.slice(0,30);state.currentQuiz=null;save();lastResult={score,correct,total:list.length,review,roundStats};renderResults();showView('resultView');
  }
  els.submitBtn.onclick=submitQuiz;

  function renderResults(){
    if(!lastResult)return;const r=lastResult;els.scoreText.textContent=r.score;els.correctResult.textContent=r.correct;els.wrongResult.textContent=r.total-r.correct;els.totalResult.textContent=r.total;els.resultTitle.textContent=r.score>=90?'掌握度很好，繼續完成剩餘題庫':r.score>=75?'基礎穩定，針對錯題再加強':r.score>=60?'已有基礎，弱項需要集中複習':'建議先從弱項主題重新整理';
    els.weaknessBox.innerHTML='';
    const active=CATEGORIES.map(c=>({c,...r.roundStats[c]})).filter(x=>x.total>0).sort((a,b)=>(a.correct/a.total)-(b.correct/b.total));
    active.forEach(x=>{const pct=Math.round(x.correct/x.total*100), cls=pct<60?'high':pct<80?'mid':'good';const d=document.createElement('div');d.className='weak-card '+cls;const cum=state.stats[x.c],cp=cum.attempts?Math.round(cum.correct/cum.attempts*100):0;d.innerHTML=`<div class="weak-top"><span>${x.c}</span><span>本回 ${x.correct}/${x.total}（${pct}%）</span></div><p>${pct<80?advice[x.c]:'本回表現良好，可維持複習節奏。'} 累計作答正確率 ${cp}%${x.wrongIds.length?`；目前此主題錯題 ${QUESTIONS.filter(q=>q.category===x.c&&state.wrong.includes(q.id)).length} 題。`:''}</p>`;els.weaknessBox.appendChild(d);});
    els.reviewList.innerHTML='';r.review.forEach((it,idx)=>{const {q,user,ok}=it;const d=document.createElement('div');d.className='review-card '+(ok?'correct':'incorrect');let opts=q.options.map((o,i)=>{let cls='review-opt';if(i===q.answerIndex)cls+=' correct-answer';if(user===i&&!ok)cls+=' user-wrong';return `<div class="${cls}">${LETTERS[i]}. ${formatText(o)}${i===q.answerIndex?' ✓ 正確答案':''}${user===i?'（你的答案）':''}</div>`}).join('');d.innerHTML=`<div class="review-head"><span>第 ${idx+1} 題｜${q.category}｜${q.sourceLabel}</span><span class="review-status">${ok?'✓ 答對':'✕ 答錯'}</span></div><div class="review-q">${formatText(q.question)}</div><div class="review-options">${opts}</div><div class="answer-note">你的答案：${user===undefined?'未作答':LETTERS[user]+'．'+formatText(q.options[user])}　｜　正確答案：${LETTERS[q.answerIndex]}．${formatText(q.options[q.answerIndex])}</div>`;els.reviewList.appendChild(d);});
  }

  els.startBtn.onclick=startNew;els.resumeBtn.onclick=resume;els.nextQuizBtn.onclick=()=>{if(buildQuiz()){renderQuiz();showView('quizView');}else{showView('homeView');updateDashboard();}};
  els.homeBtn.onclick=()=>{showView('homeView');updateDashboard();};
  els.exportBtn.onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='污水處理測驗_學習紀錄_'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);};
  els.importInput.onchange=e=>{const f=e.target.files[0];if(!f)return;const reader=new FileReader();reader.onload=()=>{try{const s=JSON.parse(reader.result);if(s.version!==1||!Array.isArray(s.mastered)||!Array.isArray(s.wrong))throw new Error();if(!confirm('匯入將覆蓋目前瀏覽器的學習紀錄，是否繼續？'))return;state=s;CATEGORIES.forEach(c=>{if(!state.stats)state.stats={};if(!state.stats[c])state.stats[c]={attempts:0,correct:0};});save();updateDashboard();alert('學習紀錄已匯入。');}catch(err){alert('無法匯入：檔案格式不正確。');}};reader.readAsText(f,'utf-8');e.target.value='';};
  els.resetBtn.onclick=()=>{if(!confirm('確定要清除全部已掌握、錯題與歷次成績嗎？此動作無法復原。'))return;state=blankState();save();updateDashboard();alert('已重設全部學習進度。');};

  updateDashboard();showView('homeView');
})();
