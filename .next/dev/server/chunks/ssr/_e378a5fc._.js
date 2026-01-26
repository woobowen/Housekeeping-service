module.exports = [
"[project]/src/lib/prisma.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "db",
    ()=>db,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__ = __turbopack_context__.i("[externals]/@prisma/client [external] (@prisma/client, cjs, [project]/node_modules/@prisma/client)");
;
/**
 * PrismaClient 单例模式实现。
 * 在开发环境下，Next.js 的热重载会导致创建多个 PrismaClient 实例，
 * 从而耗尽数据库连接池。通过将实例挂载到 globalThis 上可以避免此问题。
 */ const prismaClientSingleton = ()=>{
    return new __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__["PrismaClient"]({
        log: [
            'error'
        ]
    });
};
const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();
const db = prisma;
const __TURBOPACK__default__export__ = prisma;
if ("TURBOPACK compile-time truthy", 1) globalThis.prismaGlobal = prisma;
}),
"[project]/src/features/caregivers/schema.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CaregiverLevelEnum",
    ()=>CaregiverLevelEnum,
    "CaregiverStatusEnum",
    ()=>CaregiverStatusEnum,
    "EducationEnum",
    ()=>EducationEnum,
    "GenderEnum",
    ()=>GenderEnum,
    "LiveInStatusEnum",
    ()=>LiveInStatusEnum,
    "WorkExperienceLevelEnum",
    ()=>WorkExperienceLevelEnum,
    "caregiverFormSchema",
    ()=>caregiverFormSchema,
    "defaultCaregiverValues",
    ()=>defaultCaregiverValues
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-rsc] (ecmascript) <export * as z>");
;
const GenderEnum = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
    'MALE',
    'FEMALE'
]);
const EducationEnum = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
    'PRIMARY',
    'JUNIOR_HIGH',
    'SENIOR_HIGH',
    'VOCATIONAL',
    'COLLEGE',
    'BACHELOR'
]);
const WorkExperienceLevelEnum = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
    'ENTRY',
    'INTERMEDIATE',
    'SENIOR',
    'EXPERT'
]);
const LiveInStatusEnum = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
    'LIVE_IN',
    'LIVE_OUT',
    'BOTH'
]);
const CaregiverLevelEnum = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
    'TRAINEE',
    'JUNIOR',
    'SENIOR',
    'GOLD',
    'DIAMOND'
]);
const CaregiverStatusEnum = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
    'PENDING',
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED',
    'BLACKLISTED'
]);
const caregiverFormSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    // --- Step 1: Basic Info ---
    workerId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, '工号不能为空'),
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(2, '姓名至少需要2个字符'),
    phone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^1[3-9]\d{9}$/, '请输入有效的11位手机号码'),
    idCardNumber: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/, '请输入有效的身份证号码'),
    dob: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].coerce.date().optional().nullable(),
    gender: GenderEnum.optional().nullable(),
    nativePlace: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    education: EducationEnum.optional().nullable(),
    notes: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    // --- Step 2: Professional Info ---
    workExpLevel: WorkExperienceLevelEnum.optional().nullable(),
    isLiveIn: LiveInStatusEnum.optional().nullable(),
    specialties: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()).min(1, '请至少选择一项特长'),
    cookingSkills: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()).default([]),
    languages: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()).default([]),
    // --- Step 3: Files ---
    avatarUrl: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().url('无效的头像链接').optional().or(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].literal('')),
    idCardFrontUrl: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().url('无效的身份证正面链接').optional().or(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].literal('')),
    idCardBackUrl: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().url('无效的身份证背面链接').optional().or(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].literal('')),
    // --- Step 4: Metadata (Extensibility) ---
    metadata: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        rating: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].coerce.number().min(0).max(5).optional(),
        internalNotes: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
        customTags: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()).optional()
    }).optional()
});
const defaultCaregiverValues = {
    workerId: '',
    name: '',
    phone: '',
    idCardNumber: '',
    // dob: undefined, // Date picker usually handles undefined/null
    // gender: 'FEMALE', // Remove default
    nativePlace: '',
    // education: 'JUNIOR_HIGH', // Remove default
    // workExpLevel: 'ENTRY', // Remove default
    // isLiveIn: 'LIVE_OUT', // Remove default
    specialties: [],
    cookingSkills: [],
    languages: [],
    avatarUrl: '',
    idCardFrontUrl: '',
    idCardBackUrl: '',
    notes: '',
    metadata: {
        rating: 0,
        internalNotes: '',
        customTags: []
    }
};
}),
"[project]/src/features/caregivers/actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"00e0042958643f2757eadb780288700c8d9574de6f":"getCaregivers","4040e44bd2a869964392d7dfe3e4634d81bd3225ac":"deleteCaregiver","404c24dbfb8a4607adee53ef66000fa159d3ed73c3":"getCaregiver","40799a5a3ff51764feef7f79b0f477de03b7dc9688":"createCaregiver","60f2087def6e304318ecca0e214f4b7115cfb60c28":"updateCaregiver"},"",""] */ __turbopack_context__.s([
    "createCaregiver",
    ()=>createCaregiver,
    "deleteCaregiver",
    ()=>deleteCaregiver,
    "getCaregiver",
    ()=>getCaregiver,
    "getCaregivers",
    ()=>getCaregivers,
    "updateCaregiver",
    ()=>updateCaregiver
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/cache.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/api/navigation.react-server.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/prisma.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$caregivers$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/caregivers/schema.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__ = __turbopack_context__.i("[externals]/@prisma/client [external] (@prisma/client, cjs, [project]/node_modules/@prisma/client)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
;
;
async function createCaregiver(data) {
    const validatedFields = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$caregivers$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["caregiverFormSchema"].safeParse(data);
    if (!validatedFields.success) {
        return {
            success: false,
            errors: validatedFields.error.flatten().fieldErrors,
            message: '表单验证失败，请检查输入'
        };
    }
    const { specialties, cookingSkills, languages, metadata, ...otherData } = validatedFields.data;
    try {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].caregiver.create({
            data: {
                ...otherData,
                specialties: JSON.stringify(specialties),
                cookingSkills: JSON.stringify(cookingSkills),
                languages: JSON.stringify(languages),
                metadata: metadata ? JSON.stringify(metadata) : null,
                // 默认状态，如果在 Schema 中没有定义，可以在这里指定
                status: 'PENDING',
                level: 'TRAINEE'
            }
        });
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/caregivers');
        return {
            success: true,
            message: '护理员创建成功'
        };
    } catch (error) {
        console.error('Failed to create caregiver:', error);
        // 处理 Prisma 唯一约束冲突 (例如 workerId 重复)
        if (error instanceof __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__["Prisma"].PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                return {
                    success: false,
                    message: '该手机号或身份证号已存在'
                };
            }
        }
        return {
            success: false,
            message: '创建护理员失败，请稍后重试'
        };
    }
}
async function updateCaregiver(id, data) {
    const validatedFields = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$caregivers$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["caregiverFormSchema"].safeParse(data);
    if (!validatedFields.success) {
        return {
            success: false,
            errors: validatedFields.error.flatten().fieldErrors,
            message: '表单验证失败，请检查输入'
        };
    }
    const { specialties, cookingSkills, languages, metadata, ...otherData } = validatedFields.data;
    try {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].caregiver.update({
            where: {
                idString: id
            },
            data: {
                ...otherData,
                specialties: JSON.stringify(specialties),
                cookingSkills: JSON.stringify(cookingSkills),
                languages: JSON.stringify(languages),
                metadata: metadata ? JSON.stringify(metadata) : null
            }
        });
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/caregivers');
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(`/caregivers/${id}`);
    } catch (error) {
        console.error('Failed to update caregiver:', error);
        if (error instanceof __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__["Prisma"].PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                return {
                    success: false,
                    message: '该手机号或身份证号已存在'
                };
            }
        }
        return {
            success: false,
            message: '更新失败，请稍后重试'
        };
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])(`/caregivers/${id}`);
}
async function getCaregivers() {
    try {
        const caregivers = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].caregiver.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });
        return caregivers.map((caregiver)=>{
            // Helper to safely parse JSON
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const safeParse = (jsonString, defaultValue)=>{
                if (!jsonString) return defaultValue;
                try {
                    return JSON.parse(jsonString);
                } catch (e) {
                    console.error(`Failed to parse JSON for caregiver ${caregiver.idString}:`, e);
                    return defaultValue;
                }
            };
            return {
                ...caregiver,
                specialties: safeParse(caregiver.specialties, []),
                cookingSkills: safeParse(caregiver.cookingSkills, []),
                languages: safeParse(caregiver.languages, []),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                metadata: safeParse(caregiver.metadata, {})
            };
        });
    } catch (error) {
        console.error('Failed to fetch caregivers:', error);
        return [];
    }
}
async function getCaregiver(id) {
    try {
        const caregiver = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].caregiver.findUnique({
            where: {
                idString: id
            }
        });
        if (!caregiver) return null;
        // Helper to safely parse JSON
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const safeParse = (jsonString, defaultValue)=>{
            if (!jsonString) return defaultValue;
            try {
                return JSON.parse(jsonString);
            } catch (e) {
                console.error(`Failed to parse JSON for caregiver ${caregiver.idString}:`, e);
                return defaultValue;
            }
        };
        return {
            ...caregiver,
            specialties: safeParse(caregiver.specialties, []),
            cookingSkills: safeParse(caregiver.cookingSkills, []),
            languages: safeParse(caregiver.languages, []),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            metadata: safeParse(caregiver.metadata, {})
        };
    } catch (error) {
        console.error('Failed to fetch caregiver:', error);
        return null;
    }
}
async function deleteCaregiver(id) {
    try {
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].caregiver.delete({
            where: {
                idString: id
            }
        });
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/caregivers');
    } catch (error) {
        console.error('Failed to delete caregiver:', error);
        return {
            success: false,
            message: '删除护理员失败，请稍后重试'
        };
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])('/caregivers');
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    createCaregiver,
    updateCaregiver,
    getCaregivers,
    getCaregiver,
    deleteCaregiver
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(createCaregiver, "40799a5a3ff51764feef7f79b0f477de03b7dc9688", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(updateCaregiver, "60f2087def6e304318ecca0e214f4b7115cfb60c28", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getCaregivers, "00e0042958643f2757eadb780288700c8d9574de6f", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getCaregiver, "404c24dbfb8a4607adee53ef66000fa159d3ed73c3", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(deleteCaregiver, "4040e44bd2a869964392d7dfe3e4634d81bd3225ac", null);
}),
"[project]/.next-internal/server/app/(dashboard)/caregivers/[id]/edit/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/features/caregivers/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$caregivers$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/caregivers/actions.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
}),
"[project]/.next-internal/server/app/(dashboard)/caregivers/[id]/edit/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/features/caregivers/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "00e0042958643f2757eadb780288700c8d9574de6f",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$caregivers$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCaregivers"],
    "4040e44bd2a869964392d7dfe3e4634d81bd3225ac",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$caregivers$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["deleteCaregiver"],
    "404c24dbfb8a4607adee53ef66000fa159d3ed73c3",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$caregivers$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCaregiver"],
    "40799a5a3ff51764feef7f79b0f477de03b7dc9688",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$caregivers$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createCaregiver"],
    "60f2087def6e304318ecca0e214f4b7115cfb60c28",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$caregivers$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["updateCaregiver"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f28$dashboard$292f$caregivers$2f5b$id$5d2f$edit$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$features$2f$caregivers$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/(dashboard)/caregivers/[id]/edit/page/actions.js { ACTIONS_MODULE0 => "[project]/src/features/caregivers/actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$caregivers$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/caregivers/actions.ts [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=_e378a5fc._.js.map