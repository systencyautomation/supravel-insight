-- 1. Drop the old FK constraint
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_representative_id_fkey;

-- 2. Migrate existing data FIRST (before creating new FK)
UPDATE public.sales 
SET representative_id = 'f285504f-e5ce-47f3-a860-bdafd4798b56' 
WHERE representative_id = '47a8c14f-e802-4272-a386-9daf47dc31ca';

UPDATE public.sales 
SET representative_id = 'd821ce6c-9c12-4991-a844-4c22eb5b22c0' 
WHERE representative_id = '6a137cd4-ebf3-47e2-ac79-653590771d98';

UPDATE public.sales 
SET representative_id = '46331868-8101-4f02-9313-0d4f86115b39' 
WHERE representative_id = '8476fb1b-c464-4eaa-afb5-3745ec4ba780';

-- 3. Create new FK pointing to representative_companies
ALTER TABLE public.sales 
ADD CONSTRAINT sales_representative_id_fkey 
FOREIGN KEY (representative_id) 
REFERENCES public.representative_companies(id);