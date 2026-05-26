module.exports=[37936,(a,b,c)=>{"use strict";Object.defineProperty(c,"__esModule",{value:!0}),Object.defineProperty(c,"registerServerReference",{enumerable:!0,get:function(){return d.registerServerReference}});let d=a.r(11857)},13095,(a,b,c)=>{"use strict";function d(a){for(let b=0;b<a.length;b++){let c=a[b];if("function"!=typeof c)throw Object.defineProperty(Error(`A "use server" file can only export async functions, found ${typeof c}.
Read more: https://nextjs.org/docs/messages/invalid-use-server-value`),"__NEXT_ERROR_CODE",{value:"E352",enumerable:!1,configurable:!0})}}Object.defineProperty(c,"__esModule",{value:!0}),Object.defineProperty(c,"ensureServerEntryExports",{enumerable:!0,get:function(){return d}})},79429,a=>{"use strict";var b=a.i(37936),c=a.i(98310),d=a.i(94950);async function e(){let a=await (0,c.createClient)(),b=await (0,d.getProfile)();if(!b)throw Error("Not authenticated");if("principal"===b.role){let{data:c,error:d}=await a.from("profiles").select(`
        id,
        full_name,
        email,
        phone,
        avatar_url,
        enrollments!enrollments_student_id_fkey (
          classes (name, section),
          profiles!enrollments_parent_id_fkey (full_name, email)
        )
      `).eq("school_id",b.school_id).eq("role","student").order("full_name");if(d)throw Error(d.message);return c}if("teacher"===b.role){let{data:c}=await a.from("classes").select("id").eq("teacher_id",b.id),d=c?.map(a=>a.id)||[];if(0===d.length)return[];let{data:e,error:f}=await a.from("profiles").select(`
        id,
        full_name,
        email,
        phone,
        avatar_url,
        enrollments!enrollments_student_id_fkey!inner (
          class_id,
          classes (name, section),
          profiles!enrollments_parent_id_fkey (full_name, email)
        )
      `).eq("school_id",b.school_id).eq("role","student").in("enrollments.class_id",d).order("full_name");if(f)throw Error(f.message);return e}return[]}async function f(){let a=await (0,c.createClient)(),b=await (0,d.getProfile)();if(!b)throw Error("Not authenticated");if("principal"===b.role){let{data:c,error:d}=await a.from("classes").select(`
        id,
        name,
        grade,
        section,
        academic_year,
        profiles!classes_teacher_id_fkey (full_name),
        enrollments (student_id)
      `).eq("school_id",b.school_id).order("name");if(d)throw Error(d.message);return c}if("teacher"===b.role){let{data:c,error:d}=await a.from("classes").select(`
        id,
        name,
        grade,
        section,
        academic_year,
        enrollments (student_id)
      `).eq("teacher_id",b.id).order("name");if(d)throw Error(d.message);return c}return[]}(0,a.i(13095).ensureServerEntryExports)([e,f]),(0,b.registerServerReference)(e,"00251a6260220945b1ddd396c665c1b00f62b469c8",null),(0,b.registerServerReference)(f,"002aac341c6c6433a3f811336294fdfa218e78bcbc",null),a.s(["getClassesData",0,f,"getStudentsData",0,e])},37500,a=>{"use strict";var b=a.i(94468),c=a.i(79429);a.s([],8234),a.i(8234),a.s(["001ea2d1c64e8188117e611198ed0e8cda45d56b0f",()=>b.logout,"00251a6260220945b1ddd396c665c1b00f62b469c8",()=>c.getStudentsData,"002aac341c6c6433a3f811336294fdfa218e78bcbc",()=>c.getClassesData],37500)}];

//# sourceMappingURL=_0pmzzbl._.js.map