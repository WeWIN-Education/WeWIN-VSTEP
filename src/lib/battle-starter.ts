import { validateBattleQuestion, type BattleType } from "./battle-rules";

// Original WEWIN B1 practice, not official VSTEP exam questions. Correct option is first in source; rotate on import.
const vocabulary = `
The train was ____ because of heavy rain.|delayed|invited|borrowed|repaired|Delayed nghĩa là bị chậm; mưa lớn làm chuyến tàu đến muộn.
This bag is too ____ for me to carry.|heavy|empty|quiet|polite|Heavy là nặng, phù hợp với việc không thể mang túi.
We need to ____ the environment.|protect|invite|attend|borrow|Protect the environment nghĩa là bảo vệ môi trường.
The hotel is ____; a room costs only $20.|affordable|crowded|dangerous|silent|Affordable nghĩa là có giá hợp lý, vừa túi tiền.
Please ____ your name at the top of the form.|write|ride|wear|win|Write your name nghĩa là viết tên của bạn.
She is very ____ and always arrives on time.|punctual|nervous|noisy|wealthy|Punctual chỉ người đúng giờ.
I cannot ____ this word. What does it mean?|understand|repair|deliver|celebrate|Understand nghĩa là hiểu nội dung hoặc ý nghĩa.
The streets were ____ with people after the concert.|crowded|private|empty|narrow-minded|Crowded with people nghĩa là đông đúc người.
My brother hopes to ____ a doctor.|become|belong|remain|arrive|Become a doctor nghĩa là trở thành bác sĩ.
This medicine will help you ____ from the flu.|recover|discover|decorate|refuse|Recover from an illness nghĩa là hồi phục sau bệnh.
Could you ____ a good restaurant near here?|recommend|remind|remove|repeat|Recommend là giới thiệu hoặc đề xuất một lựa chọn tốt.
Students can ____ books from the library.|borrow|lend|buy|sell|Borrow là mượn về; lend là cho người khác mượn.
We should ____ water during the dry season.|save|spend|waste|pour|Save water nghĩa là tiết kiệm nước.
The museum has free ____ on Sundays.|admission|permission|decision|discussion|Free admission nghĩa là vào cửa miễn phí.
She felt ____ before her first job interview.|nervous|delicious|generous|ordinary|Nervous là lo lắng, thường dùng trước một sự kiện quan trọng.
The doctor told him to ____ smoking.|quit|join|keep|begin|Quit smoking nghĩa là bỏ hút thuốc.
Online lessons are ____ because I can study at home.|convenient|exhausted|harmful|ancient|Convenient nghĩa là thuận tiện.
The two buildings are very ____ in design.|similar|lonely|honest|thirsty|Similar in design nghĩa là giống nhau về thiết kế.
We need more ____ about the course fees.|information|furniture|luggage|equipment|Information about course fees là thông tin về học phí.
Please ____ the instructions carefully.|follow|miss|break|lose|Follow instructions nghĩa là làm theo hướng dẫn.
The company plans to ____ twenty new employees.|hire|retire|resign|fire|Hire employees là tuyển nhân viên; fire là sa thải.
He gave a clear ____ of how the machine works.|explanation|invitation|celebration|competition|Explanation là lời giải thích.
This road is closed. We must find another ____.|route|root|rule|role|Route là tuyến đường.
Eating vegetables is ____ for your health.|beneficial|harmful|careless|unlikely|Beneficial for health nghĩa là có lợi cho sức khỏe.
The shop offers a 20% ____ on all shoes.|discount|increase|salary|profit|Discount là mức giảm giá cho người mua.
The village is ____ by mountains on every side.|surrounded|supported|selected|suggested|Surrounded by nghĩa là được bao quanh bởi.
It is your ____ to lock the office before leaving.|responsibility|possibility|ability|popularity|Responsibility là trách nhiệm phải thực hiện.
The Internet makes it easy to ____ with friends abroad.|communicate|compete|complain|compare|Communicate with someone nghĩa là liên lạc, giao tiếp với ai.
We need a more ____ way to solve this problem.|effective|expensive|exhausted|empty|Effective chỉ cách làm mang lại kết quả mong muốn.
Her main ____ is to improve her spoken English.|goal|gate|gift|grade|Goal là mục tiêu muốn đạt được.
The teacher asked us to ____ our answers in pairs.|compare|complete|collect|contain|Compare answers nghĩa là so sánh các câu trả lời.
Many animals lose their natural ____ when forests disappear.|habitat|habit|hobby|harvest|Habitat là môi trường sống tự nhiên của sinh vật.
Public transport can help reduce air ____.|pollution|population|position|permission|Air pollution là ô nhiễm không khí.
The job requires two years of teaching ____.|experience|experiment|exercise|excitement|Teaching experience nghĩa là kinh nghiệm giảng dạy.
He is ____ enough to admit his mistake.|honest|crowded|narrow|sleepy|Honest là trung thực, sẵn sàng thừa nhận lỗi.
The city has a large ____ of young people.|population|pollution|production|protection|Population là dân số hoặc nhóm cư dân.
We must ____ whether to travel by bus or train.|decide|describe|divide|design|Decide whether nghĩa là quyết định lựa chọn giữa các khả năng.
Please keep your ticket as ____ of payment.|proof|profit|price|purpose|Proof of payment nghĩa là bằng chứng thanh toán.
The new sports centre has excellent ____.|facilities|families|factories|festivals|Facilities là cơ sở vật chất phục vụ một hoạt động.
I prefer fresh food to ____ food.|frozen|freezing|frightened|friendly|Frozen food là thực phẩm đông lạnh.
There has been a sharp ____ in fuel prices; they are much higher now.|increase|decrease|distance|balance|Increase là sự tăng lên, phù hợp với much higher.
She works as a ____ and receives no salary.|volunteer|customer|manager|passenger|Volunteer là tình nguyện viên, làm việc không nhận lương.
We had to ____ the meeting until next week.|postpone|perform|prevent|prepare|Postpone là hoãn một sự kiện sang thời điểm sau.
Please speak more ____; I cannot hear you.|loudly|quietly|politely|slowly|Loudly là to, phù hợp với việc người nghe không nghe rõ.
The restaurant serves ____ Vietnamese dishes.|traditional|temporary|technical|terrible|Traditional dishes là những món ăn truyền thống.
Can you ____ the difference between these two plans?|explain|expect|explore|exchange|Explain the difference nghĩa là giải thích sự khác nhau.
This app is ____ for both beginners and advanced learners.|suitable|responsible|absent|unaware|Suitable for nghĩa là phù hợp với.
We should ____ the amount of plastic we use.|reduce|produce|introduce|refuse|Reduce the amount nghĩa là giảm số lượng.
The village is very ____ at night, with almost no noise.|peaceful|powerful|painful|useful|Peaceful là yên bình, phù hợp với almost no noise.
The manager will ____ your application tomorrow.|review|renew|return|replace|Review an application là xem xét hồ sơ.
`;
const grammar = `
She ____ to work by bus every day.|goes|go|going|gone|Thì hiện tại đơn với chủ ngữ she: động từ thêm -s.
They ____ dinner when I called.|were having|have|are having|had had|Hành động đang diễn ra tại một thời điểm quá khứ dùng quá khứ tiếp diễn.
I have lived here ____ 2020.|since|for|during|until|Since đi với mốc bắt đầu; for đi với khoảng thời gian.
There isn't ____ milk left in the fridge.|any|many|a few|some of|Any thường dùng trong câu phủ định với danh từ không đếm được.
If it rains tomorrow, we ____ at home.|will stay|stayed|would stay|had stayed|Điều kiện loại 1: if + hiện tại đơn, will + động từ nguyên mẫu.
This book is ____ than that one.|more interesting|most interesting|interestinger|as interesting|Tính từ dài dùng more + tính từ + than khi so sánh hơn.
She enjoys ____ English podcasts.|listening to|listen to|to listen|listened to|Enjoy đi với động từ dạng V-ing; listen đi với giới từ to.
You ____ wear a helmet when riding a motorbike.|must|might|would|used to|Must diễn tả nghĩa vụ bắt buộc ở hiện tại.
The bridge ____ in 2010.|was built|built|is building|has built|Câu bị động quá khứ: was/were + quá khứ phân từ.
I wish I ____ more free time.|had|have|will have|am having|Wish về điều trái với hiện tại dùng quá khứ đơn.
He is the man ____ helped me yesterday.|who|which|whose|where|Who thay thế người, làm chủ ngữ trong mệnh đề quan hệ.
We have already ____ our homework.|finished|finish|finishing|finishes|Hiện tại hoàn thành: have/has + quá khứ phân từ.
She asked me where I ____.|lived|do live|am living|will live|Câu hỏi gián tiếp dùng trật tự chủ ngữ + động từ và lùi thì trong ngữ cảnh quá khứ.
I am interested ____ learning new languages.|in|on|at|for|Cấu trúc cố định: be interested in + danh từ/V-ing.
There are ____ students in this class than last year.|fewer|less|little|much|Fewer dùng với danh từ đếm được số nhiều khi so sánh.
He was tired, ____ he continued working.|but|because|so|unless|But nối hai ý tương phản: mệt nhưng vẫn tiếp tục làm.
I would travel more if I ____ enough money.|had|have|will have|am having|Điều kiện loại 2: if + quá khứ đơn, would + động từ.
She has never ____ to Japan.|been|be|being|went|Have been to chỉ trải nghiệm đã đến một nơi.
The room needs ____ before the guests arrive.|cleaning|clean|to cleaning|cleaned|Need + V-ing mang nghĩa bị động: cần được dọn.
He speaks English ____ than his brother.|more fluently|most fluently|fluentlier|as fluently|So sánh hơn với trạng từ dài: more fluently than.
We arrived ____ the airport at six.|at|in|on|to|Arrive at dùng với địa điểm cụ thể như sân bay.
Neither of the two answers ____ correct.|is|are|be|were being|Neither of + danh từ số nhiều thường đi với động từ số ít trong văn phong chuẩn.
Please let me ____ you with that bag.|help|to help|helping|helped|Let + tân ngữ + động từ nguyên mẫu không to.
I look forward to ____ from you.|hearing|hear|heard|be heard|To trong look forward to là giới từ nên theo sau là V-ing.
The test was ____ difficult that few students passed.|so|such|too|enough|So + tính từ + that diễn tả mức độ dẫn tới kết quả.
She is ____ university student.|a|an|the only|no|University bắt đầu bằng âm /j/, vì vậy dùng mạo từ a.
You haven't seen my keys, ____?|have you|haven't you|do you|did you|Mệnh đề chính phủ định ở hiện tại hoàn thành có đuôi khẳng định have you.
He decided ____ a new job.|to find|finding|find|found|Decide đi với to + động từ nguyên mẫu.
My sister, ____ lives in Da Nang, is a teacher.|who|which|where|what|Mệnh đề quan hệ bổ sung nói về người dùng who.
By the time we arrived, the film ____.|had started|starts|has started|is starting|Hành động xảy ra trước một mốc quá khứ dùng quá khứ hoàn thành.
I used to ____ in the countryside.|live|lived|living|lives|Used to + động từ nguyên mẫu diễn tả thói quen trong quá khứ.
He is not old enough ____ a car.|to drive|driving|drive|driven|Cấu trúc: tính từ + enough + to-infinitive.
Although it was cold, they ____ swimming.|went|go|have gone|are going|Ngữ cảnh quá khứ was dùng quá khứ đơn went.
This is the ____ meal I have ever eaten.|best|better|good|well|The best là dạng so sánh nhất của good.
Would you mind ____ the window?|opening|open|to open|opened|Would you mind + V-ing là cách nhờ lịch sự.
There is ____ information on the website.|a lot of|many|a few|an|Information không đếm được; a lot of dùng được với danh từ này.
If I ____ you, I would accept the offer.|were|am|will be|have been|If I were you là cấu trúc giả định dùng để khuyên.
She has worked here ____ three years.|for|since|from|at|For đi với khoảng thời gian three years.
The teacher told us ____ quiet.|to be|be|being|been|Tell someone to do something: bảo ai làm gì.
I don't know ____ he will come or not.|whether|unless|despite|during|Whether ... or not diễn tả hai khả năng có hoặc không.
We need to leave early ____ catch the first bus.|to|for|so|because|To + động từ nguyên mẫu diễn tả mục đích.
She is good at ____ problems.|solving|solve|solved|to solve|Sau giới từ at dùng V-ing.
He didn't go out ____ the heavy rain.|because of|because|although|even though|Because of đi với cụm danh từ; because đi với mệnh đề.
The homework must ____ by Friday.|be finished|finish|finishing|have finish|Bị động với động từ khuyết thiếu: must be + quá khứ phân từ.
I will call you as soon as I ____.|arrive|will arrive|arrived|would arrive|Mệnh đề thời gian chỉ tương lai sau as soon as dùng hiện tại đơn.
She bought ____ oranges for the picnic.|a few|a little|much|an|A few dùng với danh từ đếm được số nhiều oranges.
The more you practise, the ____ you become.|better|best|good|well|So sánh kép: the more ..., the better ...
He suggested ____ a taxi.|taking|to take|take|taken|Suggest + V-ing khi đề xuất một hoạt động.
This phone belongs to Mai. It is ____.|hers|her|she|herself|Hers là đại từ sở hữu, đứng độc lập thay cho her phone.
You can borrow my bike ____ you return it tonight.|as long as|even though|as if|so that|As long as nghĩa là miễn là, nêu điều kiện cho phép.
`;
const phrases = `
We need to ____ a decision before Friday.|make|do|take off|get up|Make a decision là đưa ra quyết định.
Please ____ attention to the safety instructions.|pay|spend|cost|take|Pay attention to nghĩa là chú ý đến.
I usually ____ my homework after dinner.|do|make|take|give|Do homework là làm bài tập về nhà.
Let's ____ a break after this exercise.|take|make|do|keep|Take a break nghĩa là nghỉ giải lao.
She wants to ____ part in the school competition.|take|make|get|have|Take part in nghĩa là tham gia.
We should ____ in touch after the course.|keep|get|make|do|Keep in touch là giữ liên lạc.
He needs to ____ an appointment with the dentist.|make|do|put|hold|Make an appointment nghĩa là đặt lịch hẹn.
I ____ out of money at the end of the month.|ran|walked|went|turned|Run out of money nghĩa là hết tiền.
Can you ____ after my cat this weekend?|look|see|watch|find|Look after nghĩa là chăm sóc.
She is ____ forward to the holiday.|looking|seeing|watching|finding|Look forward to nghĩa là mong đợi.
He finally ____ up smoking last year.|gave|made|took|put|Give up smoking nghĩa là bỏ hút thuốc.
Please ____ off the lights when you leave.|turn|take|get|put|Turn off là tắt thiết bị điện.
We need to ____ up early to catch the train.|get|make|take|put|Get up early nghĩa là thức dậy sớm.
The flight will ____ off at ten o'clock.|take|make|put|get|Take off chỉ máy bay cất cánh.
I ____ on well with my classmates.|get|take|make|put|Get on well with someone nghĩa là hòa hợp với ai.
Please ____ in this form before the interview.|fill|take|turn|put|Fill in a form nghĩa là điền biểu mẫu.
We must ____ the problem into account.|take|make|do|keep|Take something into account nghĩa là tính đến, cân nhắc.
He always ____ his best at work.|does|makes|takes|gives|Do one's best nghĩa là cố gắng hết sức.
She ____ a mistake in the last question.|made|did|took|gave|Make a mistake nghĩa là mắc lỗi.
Regular exercise can ____ a difference to your health.|make|do|take|get|Make a difference nghĩa là tạo ra thay đổi đáng kể.
The meeting will ____ place in Room 5.|take|make|do|get|Take place nghĩa là diễn ra.
I need to ____ some research for my essay.|do|make|take|get|Do research nghĩa là tiến hành nghiên cứu.
We had to ____ with a difficult situation.|deal|do|make|get|Deal with nghĩa là xử lý hoặc đối phó với.
She ____ an effort to learn ten words every day.|makes|does|takes|keeps|Make an effort nghĩa là nỗ lực.
Please ____ your time; there is no hurry.|take|make|do|get|Take your time nghĩa là cứ từ từ, không cần vội.
I ____ a cold during my trip.|caught|took|made|did|Catch a cold nghĩa là bị cảm lạnh.
He likes to ____ time with his family.|spend|pay|cost|take off|Spend time with someone nghĩa là dành thời gian với ai.
We need to ____ a solution to this problem.|find|do|take|keep|Find a solution nghĩa là tìm ra giải pháp.
The bad weather ____ us from going out.|prevented|avoided|refused|denied|Prevent someone from doing something nghĩa là ngăn ai làm gì.
This book is ____ reading if you enjoy history.|worth|cost|value|price|Be worth + V-ing nghĩa là đáng để làm gì.
I am ____ charge of organising the event.|in|on|at|by|In charge of nghĩa là phụ trách.
He was late ____ to heavy traffic.|due|because|despite|instead|Due to + danh từ nghĩa là do, bởi vì.
She learns new words ____ heart.|by|with|on|in|Learn by heart nghĩa là học thuộc lòng.
We walked home ____ foot.|on|by|in|with|On foot nghĩa là đi bộ.
You should book tickets ____ advance.|in|on|at|by|In advance nghĩa là trước, từ trước.
I met an old friend ____ chance.|by|on|at|with|By chance nghĩa là tình cờ.
The bus arrived ____ time, exactly as scheduled.|on|in|by|for|On time nghĩa là đúng giờ theo lịch.
Please get ____ touch with the school office.|in|on|at|by|Get in touch with nghĩa là liên hệ với.
She is ____ for looking after the children.|responsible|interested|afraid|similar|Responsible for nghĩa là chịu trách nhiệm về.
It depends ____ the weather.|on|in|at|of|Depend on nghĩa là phụ thuộc vào.
We are proud ____ our students' progress.|of|for|with|to|Be proud of nghĩa là tự hào về.
He apologised ____ being late.|for|to|with|at|Apologise for + V-ing là xin lỗi vì một hành động.
The new course consists ____ six lessons.|of|on|with|for|Consist of nghĩa là bao gồm.
She succeeded ____ passing the exam.|in|on|at|for|Succeed in + V-ing nghĩa là thành công trong việc gì.
I prefer tea ____ coffee.|to|than|from|over than|Cấu trúc: prefer A to B.
We are running ____ of time.|out|off|away|over|Run out of time nghĩa là sắp hoặc đã hết thời gian.
He ____ up with a useful idea during the meeting.|came|went|took|put|Come up with an idea nghĩa là nghĩ ra một ý tưởng.
Please ____ a seat while you wait.|take|do|make|get up|Take a seat là lời mời ngồi.
The company ____ training for new staff.|provides|attends|receives|borrows|Provide training nghĩa là cung cấp chương trình đào tạo.
She ____ her goal after months of hard work.|achieved|arrived|attended|allowed|Achieve a goal nghĩa là đạt được mục tiêu.
`;

export const BATTLE_STARTER = ([['VOCABULARY', vocabulary], ['GRAMMAR', grammar], ['PHRASES', phrases]] as const).flatMap(([type, rows]) =>
  rows.trim().split('\n').map((row, index) => {
    const [prompt, correctOption, ...rest] = row.split('|');
    const explanation = rest.pop()!;
    const choices = [correctOption, ...rest];
    const correct = index % 4;
    const options = [...choices.slice(4 - correct), ...choices.slice(0, 4 - correct)];
    return { sourceKey: `wewin-b1-v1-${type.toLowerCase()}-${String(index + 1).padStart(3, '0')}`, ...validateBattleQuestion({ type: type as BattleType, difficulty: 1 + Math.floor(index / 20), prompt, options, correct, explanation, published: true }) };
  })
);
