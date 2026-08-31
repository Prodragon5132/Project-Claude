/**
 * Lexicons for person/organisation detection.
 *
 * Names are the hardest PII class: there is no checksum, and "Mark the invoice
 * as Paid" must not become "[PERSON_1] the invoice as [PERSON_2]". The strategy
 * is a gazetteer of given names plus a stoplist of capitalised English words
 * that are frequently mistaken for names, and a requirement that ambiguous
 * single tokens carry supporting evidence (an honorific, a surname, a label,
 * or a signature block).
 *
 * Lists are stored as space-delimited strings: ~40% smaller over the wire than
 * a JSON array, and split once at module load.
 */

const split = (s) => s.trim().split(/\s+/);

/** Given names, lowercased. Broad international coverage of common names. */
export const GIVEN_NAMES = new Set(split(`
aaliyah aaron abby abdul abdullah abel abigail abraham ada adam addison adela adele adam
adrian adriana adrienne agnes ahmad ahmed aidan aiden aileen aimee aisha ajay akira alan
alana alastair albert alberto alden aleksandr alejandro alessandro alex alexa alexander
alexandra alexandre alexis alfie alfonso alfred ali alice alicia alina alisha alison
alistair allan allen allison alma alonso alvin alyssa amanda amar amber amelia amir amira
amos amy ana anastasia anders andre andrea andreas andrew andy angel angela angelica
angelo angus anika anita anja ann anna annabelle anne annette annie anthony antoine
antonio anya april arash archie ari ariana arianna ariel arjun arlene armando arnold
aron arthur arun asha ashley ashton asif astrid athena aubrey audrey august augustine
aurora austin autumn ava avery axel ayaan ayesha ayla babak bailey barbara barnaby barry
bart basil beatrice beau becky belinda bella ben benedict benjamin bennett benoit
bernard bernadette bernice bert beth bethany betty beverly bhavna bianca bilal bill billie
billy blair blake blanca bob bobby bonnie boris brad bradley brandon brandy brenda brendan
brent brett brian briana bridget britney brittany brock brody brooke bruce bruno bryan
bryce byron caitlin caleb callum calvin cameron camila camille candace candice cara carey
carl carla carlos carmen carol carole caroline carolyn carrie carson carter casey cassandra
cassie catalina catherine cathy cecilia cedric celeste celia cesar chad chandra chantal
charlene charles charlie charlotte chase chelsea cheryl chester chiara chloe chris christian
christina christine christopher chuck cindy claire clara clarence clark claude claudia
clayton clement cliff clifford clint clive cody colby cole colin colleen collin connor
conor conrad constance cora corey cornelius cory courtney craig cristina crystal curtis
cynthia cyrus daisy dakota dale dalia dallas dalton damian damien damon dana daniel daniela
danielle danny dante daphne darcy daria darius darlene darnell darrell darren darryl daryl
dave david davis dawn dean deanna debbie deborah debra declan dee deepak deirdre delia
della delores demetrius denis denise dennis derek derrick desmond destiny devin devon
dexter diana diane diego dilip dillon dimitri dina dinesh dion dolores dominic dominique
don donald donna donovan dora doreen dorian doris dorothy doug douglas drew duane duncan
dustin dwayne dwight dylan earl eddie eden edgar edith eduardo edward edwin efrain eileen
elaine eleanor elena eli elias elijah elin elinor elisa elise elizabeth ella ellen elliot
elliott ellis eloise elsa elsie elvira emanuel emerson emil emile emilia emilio emily emma
emmanuel emmett enrique eric erica erick erik erika erin ernest ernesto esperanza esteban
estelle esther ethan ethel eugene eunice eva evan evelyn everett ezra fabian faisal faith
farah farhan farida fatima faye federico felicia felipe felix fernanda fernando fiona flora
florence floyd forrest frances francesca francesco francis francisco frank franklin fred
freddie frederick freya gabriel gabriela gabrielle gail gareth garrett garry garth gary
gavin gayle gemma gene genevieve geoffrey george georgia georgina gerald geraldine gerard
gerardo gilbert gina giovanni giselle gladys glen glenda glenn gloria gordon grace gracie
graham grant grayson greg gregory greta griffin guadalupe guillermo gustavo guy gwen hadley
hafsa hailey hakim haley hamza hanna hannah hans harold harper harriet harrison harry
harvey hassan hattie hayden hayley hazel heather hector heidi helen helena helene henry
herbert herman hilary hilda holly homer hope horace howard hubert hudson hugh hugo hunter
huong ian ibrahim ida ignacio ilya imani imran ina india indira ines inez ingrid irene iris
irma isaac isabel isabella isabelle isaiah ismail israel ivan ivy jaan jack jackie jackson
jacob jacqueline jade jaden jaime jake jamal james jamie jan jane janet janice janine
jared jasmine jason jasper javier jay jayden jean jeanette jeanne jed jeff jefferson
jeffrey jenna jennifer jenny jeremiah jeremy jermaine jerome jerry jesse jessica jessie
jesus jill jillian jim jimmy jo joan joann joanna joanne joaquin jocelyn jodi jodie joe
joel joey johan johanna john johnny jolene jon jonah jonas jonathan jordan jorge jose
josefina joseph josephine josh joshua josiah joyce juan juanita judith judy jules julia
julian juliana julie juliet julio julius june justin justine kaden kai kaitlyn kaleb
kamal kara karen kari karim karina karl karla kate katelyn katherine kathleen kathryn
kathy katie katrina kay kayla keegan keira keith kelly kelsey ken kendall kendra kenneth
kenny kent kerry kevin khalid kiara kieran kim kimberly kirk kirsten kris krishna krista
kristen kristin kristina kristy krystal kurt kyle kylie kyra lacey lachlan laila lakshmi
lana lance landon lara larry latoya laura lauren laurence laurie lawrence layla lea leah
leandro lee leigh leila lena lenny leo leon leona leonard leonardo leroy leslie lester
leticia lewis lex lia liam lidia lila lilian lillian lily lina linda lindsay lindsey linus
lionel lisa liu liz lizzie logan lois lola lorena lorenzo loretta lori lorraine lou louis
louise lourdes lucas lucia lucian lucille lucy luigi luis luisa luka lukas luke lula luna
luther lydia lyle lynn mabel mac maddox madeline madison mae maeve magda magdalena maggie
mahmoud maia maisie malcolm malik mallory mamadou mandy manuel manuela mara marc marcel
marcelo marcia marco marcos marcus margaret margarita marge maria mariah mariam marian
marianne maribel marie marilyn marina mario marion marisa marisol marissa maritza marjorie
mark marlene marlon marsha marshall marta martha martin martina marty marvin mary maryam
mason mateo mathew mathias matilda matt matteo matthew maureen maurice mauricio max maxine
maxwell maya mckenzie meera meg megan mehmet mel melanie melinda melissa melody melvin
mercedes meredith merle mia micah michael michaela micheal michele michelle miguel mika
mikael mike mikhail milan mildred miles millie milo milton mina minh miranda miriam misty
mitch mitchell mohamed mohammad mohammed moises molly mona monica monique monty morgan
morris moses muhammad murray mustafa myles myra myrtle nadia nadine nancy naomi nasir
natalia natalie natasha nate nathan nathaniel neal ned neel neil nelson nestor nettie
nia nicholas nick nicola nicolas nicole nigel nikhil nikita niklas nikola nina noah noel
noelle nolan nora norma norman nuno oakley octavia odette olaf olga olive oliver olivia
omar oona opal ophelia orlando oscar osman otis otto owen pablo padma paige palmer pam
pamela paola paolo pat patricia patrick patti paul paula paulette pauline pawel pearl
pedro peggy penelope percy perry pete peter petra peyton phil philip philippa phillip
phoebe phyllis pierre pilar piotr polly poppy prakash pranav preston priscilla priya
qasim quentin quincy quinn rachael rachel radhika rafael raheem rahul raj rajesh ralph
ramesh ramon ramona randall randy raphael raquel rashid raul ray raymond rebecca reed
reese regina reginald rene renee reuben rex rhett rhiannon rhoda rhonda ricardo richard
rick ricky riley rita rob robert roberta roberto robin robyn rocco rochelle rocio rod
roderick rodney rodrigo roger roland rolando roman romeo ron ronald ronan ronnie rory
rosa rosalie rosalind rosanna rose rosemary rosie ross rowan roxanne roy ruben ruby rudy
rufus russell rustam ruth ryan sabine sabrina sadie safiya sage said salim sally salma
salvador sam samantha samir samuel sana sandeep sandra sandy sanjay santiago sara sarah
sasha saul savannah scott sean sebastian selena selina serena sergei sergio seth shane
shannon shari sharon shaun shauna shawn sheila shelby shelley sheri sherry sheryl shirley
sidney siena sienna sierra silas silvia simon simone sinead siobhan sofia sofie sol
solomon sonia sonja sonya sophia sophie spencer stacey stacy stan stanley stefan stefanie
stella stephanie stephen sterling steve steven stewart stuart sue sujata sunil susan
susana susanna susie suzanne sven sylvia sylvie tabitha tahir tamara tammy tania tanya
tara tariq tasha tatiana taylor ted teddy terence teresa teri terrance terrell terrence
terri terry tessa thaddeus thelma theo theodore theresa thierry thomas tia tiffany tim
timothy tina tobias toby todd tom tomas tommy toni tony tracey tracy travis trent trevor
tricia trinity tristan troy trudy tucker tyler tyrone tyson ulises ulrich uma umar ursula
usman valentina valeria valerie van vanessa vaughn velma vera verna verne veronica vicente
vicki vickie victor victoria vijay vikram vince vincent viola violet virgil virginia vivian
viviana vladimir wade walter wanda warren wayne wendy wesley whitney wilbur wilfred will
willard william willie willow wilma wilson winifred winston wyatt xander xavier xiaoming
yara yasmin yasmine yolanda yosef yousef yuki yuri yvette yvonne zachary zahra zainab zane
zara zaid zeke zelda zoe zoey zoltan zubair
`));

/** Surnames, lowercased. Used to promote "Given Surname" pairs to high confidence. */
export const SURNAMES = new Set(split(`
abbott abdi abraham acosta adams adamski aguilar ahmed alexander ali allen alvarez andersen
anderson andrews anthony arnold ashby atkinson austin avery ayala bailey baker baldwin
ball banks barber barker barnes barnett barrett barry bartlett barton bass bates baxter
beck becker bell bender benitez bennett benson berg berger bergman bernard berry best
bishop black blackwell blair blake blankenship bloom boone booth bowen bowers bowman boyd
boyer bradley brady branch brandt braun bray brennan brewer bridges briggs bright brock
brooks brown browning bruce bryan bryant buchanan buck buckley bullock burch burgess burke
burnett burns burton bush butler byrd byrne cabrera cain caldwell calderon calhoun callahan
cameron campbell campos cannon cantu cardenas carey carlson carpenter carr carrillo carroll
carson carter case casey castaneda castillo castro cervantes chambers chan chandler chang
chapman charles chase chavez chen cheng cherry chin chow christensen christian chu chung
church clark clarke clay clayton clements cleveland cline cobb cochran coffey cohen coleman
collier collins colon combs compton conley conner conrad contreras conway cook cooke cooley
cooper cope copeland cordova cortez costa cote cotton cox coyle craig crane crawford crosby
cross crowley cruz cummings cunningham curran curry curtis dalton daniel daniels dann
davenport david davidson davies davis dawson day dean decker delacruz deleon delgado
dennis desai devine diaz dickerson dickson dillon dixon dodson doherty dominguez donaldson
donnelly donovan dorsey dougherty douglas downs doyle drake dudley duffy duke duncan dunlap
dunn duran durham dyer eaton edwards elliott ellis emerson english erickson escobar espinoza
esposito estes estrada evans everett ewing farley farmer farrell faulkner feldman ferguson
fernandez ferrell fields figueroa finley finn fischer fisher fitzgerald fitzpatrick fleming
fletcher flores flowers floyd flynn foley forbes ford foreman foster fowler fox francis
franco frank franklin frazier frederick freeman french friedman frost fry frye fuentes
fuller fulton gaines gallagher gallegos galvan gamble garcia gardner garner garrett garrison
garza gates gay gentry george gibbs gibson gilbert giles gill gillespie gilmore glass glenn
glover goff golden goldberg gomez gonzales gonzalez good goodman goodwin gordon gould graham
grant graves gray green greene greer gregory griffin griffith grimes gross guerra guerrero
guthrie gutierrez guzman haas hahn hale haley hall haller hamilton hammond hampton hancock
haney hanna hansen hanson harding hardy harmon harper harrell harrington harris harrison
hart hartman harvey hatfield hawkins hayden hayes haynes hays head heath hebert helms
henderson hendricks henry hensley henson herman hernandez herrera herring hess hester
hewitt hickman hicks higgins hill hines hinton hobbs hodge hodges hoffman hogan holden
holder holland holloway holmes holt hood hooper hoover hopkins horn horne horton house
houston howard howe howell hoyt hubbard hudson huff huffman hughes hull humphrey hunt
hunter hurley hurst hussain hutchinson huynh ibrahim ingram irwin ito jackson jacobs
jacobson james jarvis jefferson jenkins jennings jensen jimenez johns johnson johnston
jones jordan joseph joyce juarez kane kang kaplan kaur keith keller kelley kelly kemp
kennedy kent kerr key khan kim king kirby kirk klein kline knapp knight knowles knox koch
kramer krause krueger lam lambert lancaster landry lane lang langley lara larsen larson
lau lawrence lawson le leach leblanc lee leon leonard lester levine levy lewis li lin
lindsey little liu livingston lloyd logan long lopez love lowe lowery lucas lucero luna
lynch lynn lyons ma macdonald mack madden maddox mahoney maldonado malone mann manning
marks marquez marsh marshall martin martinez mason massey mata mathews mathis matthews
maxwell may mayer maynard mayo mays mcbride mccall mccarthy mccarty mcclain mcclure
mcconnell mccormick mccoy mccullough mcdaniel mcdonald mcdowell mcfarland mcgee mcgowan
mcguire mcintosh mcintyre mckay mckee mckenzie mckinney mclaughlin mclean mcmahon mcmillan
mcneil mcpherson meadows medina mejia melendez melton mendez mendoza mercado mercer merritt
meyer meyers michael middleton miles miller mills miranda mitchell molina monroe montgomery
montoya moody moon mooney moore mora morales moran moreno morgan morris morrison morrow
morse mortensen morton moses mosley moss mueller mullen mullins munoz murillo murphy
murray myers nash navarro neal nelson newman newton nguyen nichols nicholson nielsen
nixon noble nolan norman norris norton nunez obrien ochoa oconnell oconnor odom odonnell
oliver olsen olson oneal oneill orozco orr ortega ortiz osborne owen owens pace pacheco
padilla page palmer park parker parks parrish parsons patel patrick patterson patton paul
payne pearson peck pena pennington perez perkins perry peters petersen peterson petty
pham phelps phillips pierce pittman pitts pollard ponce poole pope porter potter potts
powell powers pratt preston price prince pruitt puckett pugh quinn ramirez ramos ramsey
randall randolph rangel rasmussen ray raymond reed reese reeves reid reilly reyes reynolds
rhodes rice rich richard richards richardson richmond riddle riggs riley rios rivas rivera
rivers roach robbins roberson roberts robertson robinson robles rocha rodgers rodriguez
rogers rojas roman romero rosales rosario rose ross roth rowe rowland roy rubio ruiz rush
russell russo rutledge ryan salas salazar salinas sampson sanchez sanders sandoval sanford
santana santiago santos sargent saunders savage sawyer schaefer schmidt schneider schroeder
schultz schwartz scott sears sellers serrano sexton shaffer shah shannon sharp shaw shea
shelton shepard shepherd sheppard sherman shields short silva simmons simon simpson sims
singh singleton skinner slater sloan small smith snow snyder solis solomon sosa soto
sparks spears spence spencer stafford stanley stanton stark steele stein stephens stevens
stevenson stewart stokes stone stout strickland strong stuart suarez sullivan summers
sutton swanson sweeney sweet swift sykes talley tanaka tanner tate taylor terrell terry
thomas thompson thornton tillman todd torres townsend tran travis trevino trujillo tucker
turner tyler underwood valdez valencia valentine valenzuela vance vang vargas vasquez
vaughan vaughn vazquez vega velasquez velez ventura vick vincent vinson vo vogel wade
wagner walker wall wallace waller walls walsh walter walters walton ward ware warner
warren washington waters watkins watson watts weaver webb weber webster weeks weiss welch
wells werner west wheeler whitaker white whitehead whitfield whitney wiggins wilcox wilder
wiley wilkerson wilkins wilkinson williams williamson willis wilson winters wise wolf
wolfe wong wood woodard woods woodward wooten workman wright wu wyatt xu yang yates yoder
york young yu zamora zavala zhang zhao zhou zimmerman zuniga
`));

/** Titles that make the following capitalised token a person with near-certainty. */
export const HONORIFICS = new Set(split(`
mr mrs ms miss mx dr prof professor rev reverend fr father sr sister capt captain
lt lieutenant sgt sergeant col colonel gen general maj major adm admiral hon honorable
sir dame lord lady rabbi imam pastor deacon judge justice officer detective
`));

export const NAME_SUFFIXES = new Set(split(`jr sr ii iii iv v phd md dds dvm esq mba rn cpa jd`));

/**
 * Capitalised words that a naive gazetteer or "Capitalised Word" heuristic gets
 * wrong. Anything here is never a person on its own evidence.
 */
export const STOPWORDS = new Set(split(`
a about above after again against all also am an and another any are as at be because been
before being below between both but by can cannot could did do does doing down during each
few for from further had has have having he her here hers herself him himself his how i if
in into is it its itself just me more most my myself no nor not now of off on once only or
other our ours out over own same she should so some such than that the their theirs them
themselves then there these they this those through to too under until up very was we were
what when where which while who whom why will with would you your yours yourself
monday tuesday wednesday thursday friday saturday sunday
january february march april may june july august september october november december
jan feb mar apr jun jul aug sep sept oct nov dec
today tomorrow yesterday morning afternoon evening night week month year quarter
north south east west northern southern eastern western central
street avenue road boulevard drive lane court place suite floor unit apartment building
company corporation incorporated limited partners holdings group ltd llc inc plc gmbh
team department division office branch region district
account invoice receipt order payment refund balance total subtotal amount charge fee
customer client vendor supplier partner employee manager director officer president
project product service platform system software application database server network
report summary overview analysis review update status note notes memo agenda minutes
contact subject attached attachment action actions item items deadline priority
response request requests question questions answer issue issues incident ticket tickets
task tasks meeting call calls message confirmation notification reminder invitation
draft version revision appendix exhibit schedule table figure section chapter
sent forwarded original reference details description title heading body footer
please thank thanks regards sincerely best cheers hello hi hey dear greetings attn re fwd
good welcome sorry apologies noted confirmed received attached following regarding
yes no maybe true false null none nil undefined error warning success failure
english french german spanish italian chinese japanese korean arabic hindi russian
america american europe european asia asian africa african australia australian
canada canadian mexico mexican britain british england english scotland wales ireland
france germany spain italy china japan korea india brazil russia
new old first second third fourth fifth last next previous current final initial
open closed pending active inactive enabled disabled approved rejected draft published
high low medium critical major minor urgent normal
january-february monday-friday
god lord jesus christ
internet email phone mobile fax web site website page link url domain
january1 q1 q2 q3 q4 h1 h2 fy ytd mtd qtd eod eob cob asap fyi tbd tba wip poc mvp kpi roi
sla nda gdpr hipaa ccpa soc iso pci dss ferpa glba
`));

/**
 * Organisation suffixes. "Acme Corp" is company data, often as sensitive as a
 * person's name in a client-confidentiality context.
 */
export const ORG_SUFFIXES = split(`
Inc Inc. Incorporated LLC L.L.C. LLP L.L.P. LP Ltd Ltd. Limited PLC P.L.C. Corp Corp.
Corporation Co Co. Company GmbH AG NV BV SA S.A. SAS SRL S.R.L. Oy AB ApS AS PTY
Pty Holdings Group Partners Associates Ventures Capital Labs Technologies Solutions
Industries Enterprises Foundation Trust Institute Society Association Consulting
`);

/** Terms whose presence near a number strongly implies a specific PII class. */
export const CONTEXT_HINTS = {
  DOB: split(`dob d.o.b birthdate birthday born date_of_birth dateofbirth`),
  ACCOUNT: split(`account acct acc a/c iban swift bic sortcode routing aba`),
  MRN: split(`mrn medical record patient chart hospital`),
  PASSPORT: split(`passport travel document`),
  LICENSE: split(`license licence dl driver drivers driving permit`),
  POLICY: split(`policy claim insurance member subscriber`),
  EMPLOYEE: split(`employee emp staff personnel payroll badge`),
  TAX: split(`tax vat ein tin gst abn utr nino ssn sin`),
};
