  // ranks -> dense ranking for school & class
  totals.sort((a,b)=> b.total - a.total);
  let schoolRank = 0, prev = null;
  for(let i=0;i<totals.length;i++){
    if(prev === null || totals[i].total !== prev){ schoolRank++; prev = totals[i].total; }
    totals[i].schoolRank = schoolRank;
  }
  const byClass = {};
  totals.forEach(t=>{ if(!byClass[t.classId]) byClass[t.classId]=[]; byClass[t.classId].push(t); });
  Object.keys(byClass).forEach(cls=>{
    const arrCls = byClass[cls].slice().sort((a,b)=> b.total - a.total);
    let cr = 0, prevC = null;
    for(let i=0;i<arrCls.length;i++){
      if(prevC === null || arrCls[i].total !== prevC){ cr++; prevC = arrCls[i].total; }
      arrCls[i].classRank = cr;
    }
  });

  // write examTotals and studentsLatest (includes linkedExamId/name)
  const writes = [];
  for(const t of totals){
    const examTotalsId = `${examIdToPublish}_${t.studentId}`;
    const payload = {
      examId: examIdToPublish,
      examName: examDoc.name,
      linkedExamId: examDoc.linkedExamId || null,
      linkedExamName: (examDoc.linkedExamId && linkedSubjects && Object.keys(linkedSubjects).length) ? ( (await (async()=>{
        try{ const sEx = await getDoc(doc(db,'exams', examDoc.linkedExamId)); return sEx.exists()? sEx.data().name : null; }catch(e){return null;}
      })()) : null),
      components: examDoc.components || {},
      studentId: t.studentId,
      studentName: t.studentName,
      motherName: t.motherName || '',
      classId: t.classId,
      className: t.classId,
      subjects: t.subjects,
      total: t.total,
      average: t.average,
      classRank: t.classRank,
      schoolRank: t.schoolRank,
      publishedAt: Timestamp.now()
    };
    writes.push(setDoc(doc(db,'examTotals', examTotalsId), payload));
    writes.push(setDoc(doc(db,'studentsLatest', t.studentId), payload));
  }
  writes.push(updateDoc(doc(db,'exams',examIdToPublish), { status:'published', publishedAt: Timestamp.now() }));
  await Promise.all(writes);
