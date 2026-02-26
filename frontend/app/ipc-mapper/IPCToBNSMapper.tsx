"use client";

import { useState, useEffect } from "react";
import { ArrowRight, BookOpen, Scale, FileText, ArrowLeftRight, AlertCircle, Info, Copy, Check } from "lucide-react";

// Comprehensive IPC to BNS mapping data
const IPC_TO_BNS_MAP: { [key: string]: { bns: string | null; title: string; definition: string; status: "mapped" | "redacted" | "modified" } } = {
  "121": { bns: "147", title: "Waging war against Government of India", definition: "IPC Section 121 corresponds to BNS Section 147. Definition unchanged, enhanced punishment.", status: "mapped" },
  "121A": { bns: "148", title: "Conspiracy to wage war", definition: "IPC Section 121A corresponds to BNS Section 148. Enhanced punishment provisions.", status: "mapped" },
  "122": { bns: "149", title: "Collecting arms to wage war", definition: "IPC Section 122 corresponds to BNS Section 149. Updated provisions.", status: "mapped" },
  "123": { bns: "150", title: "Concealing design to wage war", definition: "IPC Section 123 corresponds to BNS Section 150. Updated provisions.", status: "mapped" },
  "124": { bns: "151", title: "Assaulting President or Governor", definition: "IPC Section 124 corresponds to BNS Section 151. Updated provisions.", status: "mapped" },
  "124A": { bns: "152", title: "Sedition (now Act endangering sovereignty)", definition: "Reformulated as Act endangering sovereignty, unity and integrity of India.", status: "modified" },
  "125": { bns: "153", title: "Waging war against foreign State at peace", definition: "IPC Section 125 corresponds to BNS Section 153. Updated provisions.", status: "mapped" },
  "126": { bns: "154", title: "Committing depredation on foreign State", definition: "IPC Section 126 corresponds to BNS Section 154. Updated provisions.", status: "mapped" },
  "127": { bns: "155", title: "Receiving property taken by war", definition: "IPC Section 127 corresponds to BNS Section 155. Updated provisions.", status: "mapped" },
  "128": { bns: "156", title: "Public servant allowing prisoner of war to escape", definition: "IPC Section 128 corresponds to BNS Section 156. Enhanced punishment.", status: "mapped" },
  "129": { bns: "157", title: "Negligently suffering prisoner of war to escape", definition: "IPC Section 129 corresponds to BNS Section 157. Updated provisions.", status: "mapped" },
  "130": { bns: "158", title: "Aiding escape of prisoner of war", definition: "IPC Section 130 corresponds to BNS Section 158. Enhanced punishment.", status: "mapped" },
  "141": { bns: "189", title: "Unlawful assembly", definition: "An assembly of five or more persons is designated an unlawful assembly if the common object is to commit certain offenses or use criminal force.", status: "mapped" },
  "142": { bns: "189(2)", title: "Being member of unlawful assembly", definition: "IPC Section 142 corresponds to BNS Section 189(2). Updated punishment.", status: "mapped" },
  "143": { bns: "189(3)", title: "Punishment for unlawful assembly", definition: "Whoever is a member of an unlawful assembly shall be punished with imprisonment up to 6 months or fine or both.", status: "mapped" },
  "144": { bns: "189(4)", title: "Joining unlawful assembly armed with deadly weapon", definition: "IPC Section 144 corresponds to BNS Section 189(4). Enhanced punishment.", status: "mapped" },
  "145": { bns: "189(5)", title: "Joining or continuing in unlawful assembly knowing it has been commanded to disperse", definition: "IPC Section 145 corresponds to BNS Section 189(5). Updated provisions.", status: "mapped" },
  "146": { bns: "190", title: "Rioting", definition: "IPC Section 146 corresponds to BNS Section 190. Definition unchanged.", status: "mapped" },
  "147": { bns: "191(2)", title: "Punishment for rioting", definition: "Whoever is guilty of rioting shall be punished with imprisonment up to 2 years or fine or both.", status: "mapped" },
  "148": { bns: "191(3)", title: "Rioting armed with deadly weapon", definition: "IPC Section 148 corresponds to BNS Section 191(3). Enhanced punishment.", status: "mapped" },
  "149": { bns: "190", title: "Every member of unlawful assembly guilty of offence committed in prosecution of common object", definition: "IPC Section 149 corresponds to BNS Section 190. Principle retained.", status: "mapped" },
  "150": { bns: "189(6)", title: "Hiring persons to join unlawful assembly", definition: "IPC Section 150 corresponds to BNS Section 189(6). Updated provisions.", status: "mapped" },
  "151": { bns: "189(7)", title: "Knowingly joining or continuing in assembly of five or more persons after it has been commanded to disperse", definition: "IPC Section 151 corresponds to BNS Section 189(7). Updated provisions.", status: "mapped" },
  "152": { bns: "189(8)", title: "Assaulting or obstructing public servant when suppressing riot", definition: "IPC Section 152 corresponds to BNS Section 189(8). Updated provisions.", status: "mapped" },
  "153": { bns: "189(9)", title: "Wantonly giving provocation with intent to cause riot", definition: "IPC Section 153 corresponds to BNS Section 189(9). Updated provisions.", status: "mapped" },
  "153A": { bns: "196", title: "Promoting enmity between different groups", definition: "Whoever promotes enmity between groups on grounds of religion, race, place of birth, residence, language, etc., shall be punished with imprisonment up to 3 years or fine or both.", status: "mapped" },
  "153AA": { bns: "196(2)", title: "Promoting enmity in place of worship", definition: "IPC Section 153AA corresponds to BNS Section 196(2). Specific provision added in BNS.", status: "mapped" },
  "153B": { bns: "197", title: "Imputations and assertions prejudicial to national integration", definition: "IPC Section 153B corresponds to BNS Section 197. Updated provisions.", status: "mapped" },
  "154": { bns: "193", title: "Owner or occupier of land on which unlawful assembly is held", definition: "IPC Section 154 corresponds to BNS Section 193. Updated provisions.", status: "mapped" },
  "155": { bns: "195", title: "Liability of person for whose benefit riot is committed", definition: "IPC Section 155 corresponds to BNS Section 195. Updated provisions.", status: "mapped" },
  "156": { bns: "195", title: "Liability of agent of owner or occupier for whose benefit riot is committed", definition: "IPC Section 156 corresponds to BNS Section 195. Consolidated with 155.", status: "mapped" },
  "157": { bns: "195", title: "Harbouring persons hired for unlawful assembly", definition: "IPC Section 157 corresponds to BNS Section 195. Updated provisions.", status: "mapped" },
  "158": { bns: "194", title: "Being hired to take part in unlawful assembly or riot", definition: "IPC Section 158 corresponds to BNS Section 194. Updated provisions.", status: "mapped" },
  "159": { bns: "192", title: "Affray", definition: "IPC Section 159 corresponds to BNS Section 192. Updated provisions.", status: "mapped" },
  "160": { bns: "192", title: "Punishment for committing affray", definition: "IPC Section 160 corresponds to BNS Section 192. Consolidated with 159.", status: "mapped" },
  "161": { bns: null, title: "Public servant taking gratification other than legal remuneration", definition: "IPC Section 161 is not directly mapped to BNS. Now covered under Prevention of Corruption Act, 1988.", status: "redacted" },
  "162": { bns: null, title: "Taking gratification in order by corrupt or illegal means to influence public servant", definition: "IPC Section 162 is not directly mapped to BNS. Covered under Prevention of Corruption Act.", status: "redacted" },
  "163": { bns: null, title: "Taking gratification for exercise of personal influence with public servant", definition: "IPC Section 163 is not directly mapped to BNS. Covered under Prevention of Corruption Act.", status: "redacted" },
  "164": { bns: null, title: "Punishment for abetment of above offences", definition: "IPC Section 164 is not directly mapped to BNS. Covered under Prevention of Corruption Act.", status: "redacted" },
  "165": { bns: null, title: "Public servant obtaining valuable thing without consideration from person concerned in proceeding", definition: "IPC Section 165 is not directly mapped to BNS. Covered under Prevention of Corruption Act.", status: "redacted" },
  "166": { bns: "198", title: "Public servant disobeying law with intent to cause injury to any person", definition: "IPC Section 166 corresponds to BNS Section 198. Updated provisions.", status: "mapped" },
  "166A": { bns: "199", title: "Public servant disobeying direction under law", definition: "IPC Section 166A corresponds to BNS Section 199. Enhanced for specific cases including rape investigation.", status: "mapped" },
  "166B": { bns: "200", title: "Punishment for non-treatment of victim", definition: "IPC Section 166B corresponds to BNS Section 200. New provision mandating medical care for victims.", status: "modified" },
  "167": { bns: "201", title: "Public servant framing an incorrect document with intent to cause injury", definition: "IPC Section 167 corresponds to BNS Section 201. Updated provisions.", status: "mapped" },
  "168": { bns: "202", title: "Public servant unlawfully engaging in trade", definition: "IPC Section 168 corresponds to BNS Section 202. Community service option added.", status: "mapped" },
  "169": { bns: "203", title: "Public servant unlawfully buying or bidding for property", definition: "IPC Section 169 corresponds to BNS Section 203. Updated provisions.", status: "mapped" },
  "170": { bns: "204", title: "Personating a public servant", definition: "IPC Section 170 corresponds to BNS Section 204. Enhanced punishment.", status: "mapped" },
  "171": { bns: "205", title: "Wearing garb or carrying token used by public servant with fraudulent intent", definition: "IPC Section 171 corresponds to BNS Section 205. Updated provisions.", status: "mapped" },
  "171A": { bns: "169", title: "Candidate and electoral right defined", definition: "IPC Section 171A corresponds to BNS Section 169. Definition retained.", status: "mapped" },
  "171B": { bns: "170", title: "Bribery", definition: "IPC Section 171B corresponds to BNS Section 170. Definition updated.", status: "mapped" },
  "171C": { bns: "171", title: "Undue influence at elections", definition: "IPC Section 171C corresponds to BNS Section 171. Updated provisions.", status: "mapped" },
  "171D": { bns: "172", title: "Personation at elections", definition: "IPC Section 171D corresponds to BNS Section 172. Updated provisions.", status: "mapped" },
  "171E": { bns: "173", title: "Punishment for bribery", definition: "IPC Section 171E corresponds to BNS Section 173. Updated punishment.", status: "mapped" },
  "171F": { bns: "174", title: "Punishment for undue influence or personation at an election", definition: "IPC Section 171F corresponds to BNS Section 174. Updated punishment.", status: "mapped" },
  "171G": { bns: "175", title: "False statement in connection with an election", definition: "IPC Section 171G corresponds to BNS Section 175. Updated provisions.", status: "mapped" },
  "171H": { bns: "176", title: "Illegal payments in connection with an election", definition: "IPC Section 171H corresponds to BNS Section 176. Updated provisions.", status: "mapped" },
  "171I": { bns: "177", title: "Failure to keep election accounts", definition: "IPC Section 171I corresponds to BNS Section 177. Updated provisions.", status: "mapped" },
  "172": { bns: "179", title: "Absconding to avoid service of summons or other proceeding", definition: "IPC Section 172 corresponds to BNS Section 179. Updated provisions.", status: "mapped" },
  "173": { bns: "180", title: "Preventing service of summons or other proceeding or preventing publication thereof", definition: "IPC Section 173 corresponds to BNS Section 180. Updated provisions.", status: "mapped" },
  "174": { bns: "181", title: "Non-attendance in obedience to an order from public servant", definition: "IPC Section 174 corresponds to BNS Section 181. Updated provisions.", status: "mapped" },
  "174A": { bns: "182", title: "Non-appearance in response to a proclamation under section 82 of CrPC", definition: "IPC Section 174A corresponds to BNS Section 182. Updated provisions.", status: "mapped" },
  "175": { bns: "183", title: "Omission to produce document to public servant by person legally bound to produce it", definition: "IPC Section 175 corresponds to BNS Section 183. Updated provisions.", status: "mapped" },
  "176": { bns: "184", title: "Omission to give notice or information to public servant by person legally bound to give it", definition: "IPC Section 176 corresponds to BNS Section 184. Updated provisions.", status: "mapped" },
  "177": { bns: "185", title: "Furnishing false information", definition: "IPC Section 177 corresponds to BNS Section 185. Updated provisions.", status: "mapped" },
  "178": { bns: "186", title: "Refusing oath or affirmation when duly required by public servant to make it", definition: "IPC Section 178 corresponds to BNS Section 186. Updated provisions.", status: "mapped" },
  "179": { bns: "187", title: "Refusing to answer public servant authorised to question", definition: "IPC Section 179 corresponds to BNS Section 187. Updated provisions.", status: "mapped" },
  "180": { bns: "188", title: "Refusing to sign statement", definition: "IPC Section 180 corresponds to BNS Section 188. Updated provisions.", status: "mapped" },
  "181": { bns: "213", title: "False statement on oath or affirmation to public servant or person authorised to administer an oath", definition: "IPC Section 181 corresponds to BNS Section 213. Repositioned in BNS.", status: "mapped" },
  "182": { bns: "214", title: "False information with intent to cause public servant to use his lawful power to the injury of another person", definition: "IPC Section 182 corresponds to BNS Section 214. Enhanced punishment.", status: "mapped" },
  "183": { bns: "215", title: "Resistance to the taking of property by the lawful authority of a public servant", definition: "IPC Section 183 corresponds to BNS Section 215. Updated provisions.", status: "mapped" },
  "184": { bns: "216", title: "Obstructing sale of property offered for sale by authority of public servant", definition: "IPC Section 184 corresponds to BNS Section 216. Updated provisions.", status: "mapped" },
  "185": { bns: "217", title: "Illegal purchase or bid for property offered for sale by authority of public servant", definition: "IPC Section 185 corresponds to BNS Section 217. Updated provisions.", status: "mapped" },
  "186": { bns: "218", title: "Obstructing public servant in discharge of public functions", definition: "IPC Section 186 corresponds to BNS Section 218. Updated provisions.", status: "mapped" },
  "187": { bns: "219", title: "Omission to assist public servant when bound by law to give assistance", definition: "IPC Section 187 corresponds to BNS Section 219. Updated provisions.", status: "mapped" },
  "188": { bns: "220", title: "Disobedience to order duly promulgated by public servant", definition: "IPC Section 188 corresponds to BNS Section 220. Enhanced punishment.", status: "mapped" },
  "189": { bns: "221", title: "Threat of injury to public servant", definition: "IPC Section 189 corresponds to BNS Section 221. Updated provisions.", status: "mapped" },
  "190": { bns: "222", title: "Threat of injury to induce person to refrain from applying for protection to public servant", definition: "IPC Section 190 corresponds to BNS Section 222. Updated provisions.", status: "mapped" },
  "191": { bns: "223", title: "Giving false evidence", definition: "IPC Section 191 corresponds to BNS Section 223. Definition unchanged.", status: "mapped" },
  "192": { bns: "224", title: "Fabricating false evidence", definition: "IPC Section 192 corresponds to BNS Section 224. Updated provisions.", status: "mapped" },
  "193": { bns: "225", title: "Punishment for false evidence", definition: "IPC Section 193 corresponds to BNS Section 225. Enhanced punishment.", status: "mapped" },
  "194": { bns: "226", title: "Giving or fabricating false evidence with intent to procure conviction of capital offence", definition: "IPC Section 194 corresponds to BNS Section 226. Updated provisions.", status: "mapped" },
  "195": { bns: "227", title: "Giving or fabricating false evidence with intent to procure conviction of offence punishable with imprisonment for life or imprisonment", definition: "IPC Section 195 corresponds to BNS Section 227. Enhanced punishment.", status: "mapped" },
  "195A": { bns: "228", title: "Threatening any person to give false evidence", definition: "IPC Section 195A corresponds to BNS Section 228. Updated provisions.", status: "mapped" },
  "196": { bns: "229", title: "Using evidence known to be false", definition: "IPC Section 196 corresponds to BNS Section 229. Updated provisions.", status: "mapped" },
  "197": { bns: "230", title: "Issuing or signing false certificate", definition: "IPC Section 197 corresponds to BNS Section 230. Updated provisions.", status: "mapped" },
  "198": { bns: "231", title: "Using as true a certificate known to be false", definition: "IPC Section 198 corresponds to BNS Section 231. Updated provisions.", status: "mapped" },
  "199": { bns: "232", title: "False statement made in declaration which is by law receivable as evidence", definition: "IPC Section 199 corresponds to BNS Section 232. Updated provisions.", status: "mapped" },
  "200": { bns: "233", title: "Using as true such declaration knowing it to be false", definition: "IPC Section 200 corresponds to BNS Section 233. Updated provisions.", status: "mapped" },
  "201": { bns: "234", title: "Causing disappearance of evidence of offence or giving false information to screen offender", definition: "IPC Section 201 corresponds to BNS Section 234. Enhanced punishment.", status: "mapped" },
  "202": { bns: "235", title: "Intentional omission to give information of offence by person bound to inform", definition: "IPC Section 202 corresponds to BNS Section 235. Updated provisions.", status: "mapped" },
  "203": { bns: "236", title: "Giving false information respecting an offence committed", definition: "IPC Section 203 corresponds to BNS Section 236. Updated provisions.", status: "mapped" },
  "204": { bns: "237", title: "Destruction of document to prevent its production as evidence", definition: "IPC Section 204 corresponds to BNS Section 237. Updated provisions.", status: "mapped" },
  "205": { bns: "238", title: "False personation for purpose of act or proceeding in suit or prosecution", definition: "IPC Section 205 corresponds to BNS Section 238. Updated provisions.", status: "mapped" },
  "206": { bns: "239", title: "Fraudulent removal or concealment of property to prevent its seizure as forfeiture or in execution", definition: "IPC Section 206 corresponds to BNS Section 239. Updated provisions.", status: "mapped" },
  "207": { bns: "240", title: "Fraudulent claim to property to prevent its seizure as forfeiture or in execution", definition: "IPC Section 207 corresponds to BNS Section 240. Updated provisions.", status: "mapped" },
  "208": { bns: "241", title: "Fraudulently suffering decree for sum not due", definition: "IPC Section 208 corresponds to BNS Section 241. Updated provisions.", status: "mapped" },
  "209": { bns: "242", title: "Dishonestly making false claim in Court", definition: "IPC Section 209 corresponds to BNS Section 242. Updated provisions.", status: "mapped" },
  "210": { bns: "243", title: "Fraudulently obtaining decree for sum not due", definition: "IPC Section 210 corresponds to BNS Section 243. Updated provisions.", status: "mapped" },
  "211": { bns: "244", title: "False charge of offence made with intent to injure", definition: "IPC Section 211 corresponds to BNS Section 244. Enhanced punishment.", status: "mapped" },
  "212": { bns: "245", title: "Harbouring offender", definition: "IPC Section 212 corresponds to BNS Section 245. Updated provisions.", status: "mapped" },
  "213": { bns: "246", title: "Taking gift to screen an offender from punishment", definition: "IPC Section 213 corresponds to BNS Section 246. Updated provisions.", status: "mapped" },
  "214": { bns: "247", title: "Offering gift or restoration of property in consideration of screening offender", definition: "IPC Section 214 corresponds to BNS Section 247. Updated provisions.", status: "mapped" },
  "215": { bns: "248", title: "Taking gift to help to recover stolen property", definition: "IPC Section 215 corresponds to BNS Section 248. Updated provisions.", status: "mapped" },
  "216": { bns: "249", title: "Harbouring offender who has escaped from custody or whose apprehension has been ordered", definition: "IPC Section 216 corresponds to BNS Section 249. Updated provisions.", status: "mapped" },
  "216A": { bns: "250", title: "Penalty for harbouring robbers or dacoits", definition: "IPC Section 216A corresponds to BNS Section 250. Enhanced punishment.", status: "mapped" },
  "216B": { bns: "251", title: "Definition of harbour", definition: "IPC Section 216B corresponds to BNS Section 251. Clarification provided.", status: "mapped" },
  "217": { bns: "252", title: "Public servant disobeying direction of law with intent to save person from punishment or property from forfeiture", definition: "IPC Section 217 corresponds to BNS Section 252. Updated provisions.", status: "mapped" },
  "218": { bns: "253", title: "Public servant framing incorrect record or writing with intent to save person from punishment or property from forfeiture", definition: "IPC Section 218 corresponds to BNS Section 253. Updated provisions.", status: "mapped" },
  "219": { bns: "254", title: "Public servant in judicial proceeding corruptly making report etc. contrary to law", definition: "IPC Section 219 corresponds to BNS Section 254. Enhanced punishment.", status: "mapped" },
  "220": { bns: "255", title: "Commitment for trial or confinement by person having authority who knows that he is acting contrary to law", definition: "IPC Section 220 corresponds to BNS Section 255. Updated provisions.", status: "mapped" },
  "221": { bns: "256", title: "Intentional omission to apprehend on the part of public servant bound to apprehend", definition: "IPC Section 221 corresponds to BNS Section 256. Updated provisions.", status: "mapped" },
  "222": { bns: "257", title: "Intentional omission to apprehend on the part of public servant bound to apprehend person under sentence or lawfully committed", definition: "IPC Section 222 corresponds to BNS Section 257. Updated provisions.", status: "mapped" },
  "223": { bns: "258", title: "Escape from confinement or custody negligently suffered by public servant", definition: "IPC Section 223 corresponds to BNS Section 258. Updated provisions.", status: "mapped" },
  "224": { bns: "259", title: "Resistance or obstruction by a person to his lawful apprehension", definition: "IPC Section 224 corresponds to BNS Section 259. Updated provisions.", status: "mapped" },
  "225": { bns: "260", title: "Resistance or obstruction to lawful apprehension of another person", definition: "IPC Section 225 corresponds to BNS Section 260. Updated provisions.", status: "mapped" },
  "225A": { bns: "261", title: "Omission to apprehend or sufferance of escape on part of public servant in cases not otherwise provided for", definition: "IPC Section 225A corresponds to BNS Section 261. Updated provisions.", status: "mapped" },
  "225B": { bns: "262", title: "Resistance or obstruction to lawful apprehension or escape or rescue in cases not otherwise provided for", definition: "IPC Section 225B corresponds to BNS Section 262. Updated provisions.", status: "mapped" },
  "226": { bns: "263", title: "Unlawful return from transportation", definition: "IPC Section 226 corresponds to BNS Section 263. Modernized for current context.", status: "modified" },
  "227": { bns: "264", title: "Violation of condition of remission of punishment", definition: "IPC Section 227 corresponds to BNS Section 264. Updated provisions.", status: "mapped" },
  "228": { bns: "265", title: "Intentional insult or interruption to public servant sitting in judicial proceeding", definition: "IPC Section 228 corresponds to BNS Section 265. Updated provisions.", status: "mapped" },
  "228A": { bns: "72", title: "Disclosure of identity of the victim of certain offences", definition: "IPC Section 228A corresponds to BNS Section 72. Moved to offences against women section.", status: "mapped" },
  "229": { bns: "266", title: "Personation of a juror or assessor", definition: "IPC Section 229 corresponds to BNS Section 266. Updated provisions.", status: "mapped" },
  "229A": { bns: "267", title: "Failure by person released on bail or bond to appear in Court", definition: "IPC Section 229A corresponds to BNS Section 267. New provision in IPC, retained in BNS.", status: "modified" },
  "230": { bns: "268", title: "Coin defined", definition: "IPC Section 230 corresponds to BNS Section 268. Definition retained.", status: "mapped" },
  "231": { bns: "269", title: "Counterfeiting coin", definition: "IPC Section 231 corresponds to BNS Section 269. Updated provisions.", status: "mapped" },
  "232": { bns: "270", title: "Counterfeiting Indian coin", definition: "IPC Section 232 corresponds to BNS Section 270. Enhanced punishment.", status: "mapped" },
  "233": { bns: "271", title: "Making or selling instrument for counterfeiting coin", definition: "IPC Section 233 corresponds to BNS Section 271. Updated provisions.", status: "mapped" },
  "234": { bns: "272", title: "Making or selling instrument for counterfeiting Indian coin", definition: "IPC Section 234 corresponds to BNS Section 272. Enhanced punishment.", status: "mapped" },
  "235": { bns: "273", title: "Possession of instrument for counterfeiting coin", definition: "IPC Section 235 corresponds to BNS Section 273. Updated provisions.", status: "mapped" },
  "236": { bns: "274", title: "Abetting in India the counterfeiting out of India of coin", definition: "IPC Section 236 corresponds to BNS Section 274. Updated provisions.", status: "mapped" },
  "237": { bns: "275", title: "Import or export of counterfeit coin", definition: "IPC Section 237 corresponds to BNS Section 275. Updated provisions.", status: "mapped" },
  "238": { bns: "276", title: "Import or export of counterfeits of Indian coin", definition: "IPC Section 238 corresponds to BNS Section 276. Enhanced punishment.", status: "mapped" },
  "239": { bns: "277", title: "Delivery of coin possessed with knowledge that it is counterfeit", definition: "IPC Section 239 corresponds to BNS Section 277. Updated provisions.", status: "mapped" },
  "240": { bns: "278", title: "Delivery of Indian coin possessed with knowledge that it is counterfeit", definition: "IPC Section 240 corresponds to BNS Section 278. Enhanced punishment.", status: "mapped" },
  "241": { bns: "279", title: "Delivery of coin as genuine which possessor knows to be counterfeit", definition: "IPC Section 241 corresponds to BNS Section 279. Updated provisions.", status: "mapped" },
  "242": { bns: "280", title: "Possession of counterfeit coin by person who knew it to be counterfeit when he became possessed thereof", definition: "IPC Section 242 corresponds to BNS Section 280. Updated provisions.", status: "mapped" },
  "243": { bns: "281", title: "Possession of Indian coin by person who knew it to be counterfeit when he became possessed thereof", definition: "IPC Section 243 corresponds to BNS Section 281. Enhanced punishment.", status: "mapped" },
  "244": { bns: "282", title: "Person employed in mint causing coin to be of different weight or composition from that fixed by law", definition: "IPC Section 244 corresponds to BNS Section 282. Updated provisions.", status: "mapped" },
  "245": { bns: "283", title: "Unlawfully taking coining instrument from mint", definition: "IPC Section 245 corresponds to BNS Section 283. Updated provisions.", status: "mapped" },
  "246": { bns: "284", title: "Fraudulently or dishonestly diminishing weight or altering composition of coin", definition: "IPC Section 246 corresponds to BNS Section 284. Updated provisions.", status: "mapped" },
  "247": { bns: "285", title: "Fraudulently or dishonestly diminishing weight or altering composition of Indian coin", definition: "IPC Section 247 corresponds to BNS Section 285. Enhanced punishment.", status: "mapped" },
  "248": { bns: "286", title: "Altering appearance of coin with intent that it shall pass as coin of different description", definition: "IPC Section 248 corresponds to BNS Section 286. Updated provisions.", status: "mapped" },
  "249": { bns: "287", title: "Altering appearance of Indian coin with intent that it shall pass as coin of different description", definition: "IPC Section 249 corresponds to BNS Section 287. Enhanced punishment.", status: "mapped" },
  "250": { bns: "288", title: "Delivery of coin possessed with knowledge that it is altered", definition: "IPC Section 250 corresponds to BNS Section 288. Updated provisions.", status: "mapped" },
  "251": { bns: "289", title: "Delivery of Indian coin possessed with knowledge that it is altered", definition: "IPC Section 251 corresponds to BNS Section 289. Enhanced punishment.", status: "mapped" },
  "252": { bns: "290", title: "Possession of coin by person who knew it to be altered when he became possessed thereof", definition: "IPC Section 252 corresponds to BNS Section 290. Updated provisions.", status: "mapped" },
  "253": { bns: "291", title: "Possession of Indian coin by person who knew it to be altered when he became possessed thereof", definition: "IPC Section 253 corresponds to BNS Section 291. Enhanced punishment.", status: "mapped" },
  "254": { bns: "292", title: "Delivery of coin as genuine which possessor knows to be altered", definition: "IPC Section 254 corresponds to BNS Section 292. Updated provisions.", status: "mapped" },
  "255": { bns: "293", title: "Counterfeiting Government stamp", definition: "IPC Section 255 corresponds to BNS Section 293. Updated provisions.", status: "mapped" },
  "256": { bns: "294", title: "Having possession of instrument or material for counterfeiting Government stamp", definition: "IPC Section 256 corresponds to BNS Section 294. Updated provisions.", status: "mapped" },
  "257": { bns: "295", title: "Making or selling instrument for counterfeiting Government stamp", definition: "IPC Section 257 corresponds to BNS Section 295. Updated provisions.", status: "mapped" },
  "258": { bns: "296", title: "Sale of counterfeit Government stamp", definition: "IPC Section 258 corresponds to BNS Section 296. Updated provisions.", status: "mapped" },
  "259": { bns: "297", title: "Having possession of counterfeit Government stamp", definition: "IPC Section 259 corresponds to BNS Section 297. Updated provisions.", status: "mapped" },
  "260": { bns: "298", title: "Using as genuine a Government stamp known to be counterfeit", definition: "IPC Section 260 corresponds to BNS Section 298. Updated provisions.", status: "mapped" },
  "261": { bns: "299", title: "Effacing writing from substance bearing Government stamp or removing from document a stamp used for it", definition: "IPC Section 261 corresponds to BNS Section 299. Updated provisions.", status: "mapped" },
  "262": { bns: "300", title: "Using Government stamp known to have been before used", definition: "IPC Section 262 corresponds to BNS Section 300. Updated provisions.", status: "mapped" },
  "263": { bns: "301", title: "Erasure of mark denoting that stamp has been used", definition: "IPC Section 263 corresponds to BNS Section 301. Updated provisions.", status: "mapped" },
  "263A": { bns: "302", title: "Prohibition of fictitious stamps", definition: "IPC Section 263A corresponds to BNS Section 302. Updated provisions.", status: "mapped" },
  "264": { bns: "336", title: "Fraudulent use of false instrument for weighing", definition: "IPC Section 264 corresponds to BNS Section 336. Repositioned under forgery chapter.", status: "mapped" },
  "265": { bns: "336", title: "Fraudulent use of false weight or measure", definition: "IPC Section 265 corresponds to BNS Section 336. Consolidated with 264.", status: "mapped" },
  "266": { bns: "336", title: "Being in possession of false weight or measure", definition: "IPC Section 266 corresponds to BNS Section 336. Consolidated with 264.", status: "mapped" },
  "267": { bns: "336", title: "Making or selling false weight or measure", definition: "IPC Section 267 corresponds to BNS Section 336. Consolidated with 264.", status: "mapped" },
  "268": { bns: "270", title: "Public nuisance", definition: "IPC Section 268 corresponds to BNS Section 270. Definition retained.", status: "mapped" },
  "269": { bns: "271", title: "Negligent act likely to spread infection of disease dangerous to life", definition: "IPC Section 269 corresponds to BNS Section 271. Updated with modern context.", status: "mapped" },
  "270": { bns: "272", title: "Malignant act likely to spread infection of disease dangerous to life", definition: "IPC Section 270 corresponds to BNS Section 272. Enhanced punishment post-pandemic.", status: "mapped" },
  "271": { bns: "273", title: "Disobedience to quarantine rule", definition: "IPC Section 271 corresponds to BNS Section 273. Updated provisions.", status: "mapped" },
  "272": { bns: "274", title: "Adulteration of food or drink intended for sale", definition: "IPC Section 272 corresponds to BNS Section 274. Enhanced punishment.", status: "mapped" },
  "273": { bns: "275", title: "Sale of noxious food or drink", definition: "IPC Section 273 corresponds to BNS Section 275. Updated provisions.", status: "mapped" },
  "274": { bns: "276", title: "Adulteration of drugs", definition: "IPC Section 274 corresponds to BNS Section 276. Enhanced punishment.", status: "mapped" },
  "275": { bns: "277", title: "Sale of adulterated drugs", definition: "IPC Section 275 corresponds to BNS Section 277. Updated provisions.", status: "mapped" },
  "276": { bns: "278", title: "Sale of drug as a different drug or preparation", definition: "IPC Section 276 corresponds to BNS Section 278. Updated provisions.", status: "mapped" },
  "277": { bns: "279", title: "Fouling water of public spring or reservoir", definition: "IPC Section 277 corresponds to BNS Section 279. Updated provisions.", status: "mapped" },
  "278": { bns: "280", title: "Making atmosphere noxious to health", definition: "IPC Section 278 corresponds to BNS Section 280. Updated provisions.", status: "mapped" },
  "279": { bns: "281", title: "Rash driving or riding on a public way", definition: "IPC Section 279 corresponds to BNS Section 281. Modernized for vehicles, enhanced punishment.", status: "modified" },
  "280": { bns: "282", title: "Rash navigation of vessel", definition: "IPC Section 280 corresponds to BNS Section 282. Updated provisions.", status: "mapped" },
  "281": { bns: "283", title: "Exhibition of false light, mark or buoy", definition: "IPC Section 281 corresponds to BNS Section 283. Updated provisions.", status: "mapped" },
  "282": { bns: "284", title: "Conveying person by water for hire in unsafe or overloaded vessel", definition: "IPC Section 282 corresponds to BNS Section 284. Updated provisions.", status: "mapped" },
  "283": { bns: "285", title: "Danger or obstruction in public way or line of navigation", definition: "IPC Section 283 corresponds to BNS Section 285. Updated provisions.", status: "mapped" },
  "284": { bns: "286", title: "Negligent conduct with respect to poisonous substance", definition: "IPC Section 284 corresponds to BNS Section 286. Updated provisions.", status: "mapped" },
  "285": { bns: "287", title: "Negligent conduct with respect to fire or combustible matter", definition: "IPC Section 285 corresponds to BNS Section 287. Updated provisions.", status: "mapped" },
  "286": { bns: "288", title: "Negligent conduct with respect to explosive substance", definition: "IPC Section 286 corresponds to BNS Section 288. Enhanced punishment.", status: "mapped" },
  "287": { bns: "289", title: "Negligent conduct with respect to machinery", definition: "IPC Section 287 corresponds to BNS Section 289. Updated provisions.", status: "mapped" },
  "288": { bns: "290", title: "Negligent conduct with respect to pulling down or repairing buildings", definition: "IPC Section 288 corresponds to BNS Section 290. Updated provisions.", status: "mapped" },
  "289": { bns: "291", title: "Negligent conduct with respect to animal", definition: "IPC Section 289 corresponds to BNS Section 291. Updated provisions.", status: "mapped" },
  "290": { bns: "292", title: "Punishment for public nuisance in cases not otherwise provided for", definition: "IPC Section 290 corresponds to BNS Section 292. Updated provisions.", status: "mapped" },
  "291": { bns: "293", title: "Continuance of nuisance after injunction to discontinue", definition: "IPC Section 291 corresponds to BNS Section 293. Updated provisions.", status: "mapped" },
  "292": { bns: "294", title: "Sale of obscene books etc.", definition: "IPC Section 292 corresponds to BNS Section 294. Modernized for digital content.", status: "modified" },
  "293": { bns: "295", title: "Sale of obscene objects to young person", definition: "IPC Section 293 corresponds to BNS Section 295. Enhanced protection for minors.", status: "mapped" },
  "294": { bns: "296", title: "Obscene acts and songs", definition: "IPC Section 294 corresponds to BNS Section 296. Updated provisions.", status: "mapped" },
  "294A": { bns: "297", title: "Keeping lottery office", definition: "IPC Section 294A corresponds to BNS Section 297. Updated provisions.", status: "mapped" },
  "295": { bns: "298", title: "Injuring or defiling place of worship with intent to insult the religion of any class", definition: "IPC Section 295 corresponds to BNS Section 298. Updated provisions.", status: "mapped" },
  "295A": { bns: "299", title: "Deliberate and malicious acts intended to outrage religious feelings of any class by insulting its religion or religious beliefs", definition: "Whoever with deliberate intent of outraging religious feelings insults religion or religious beliefs shall be punished with imprisonment up to 3 years or fine or both.", status: "mapped" },
  "296": { bns: "300", title: "Disturbing religious assembly", definition: "IPC Section 296 corresponds to BNS Section 300. Updated provisions.", status: "mapped" },
  "297": { bns: "301", title: "Trespassing on burial places etc.", definition: "IPC Section 297 corresponds to BNS Section 301. Updated provisions.", status: "mapped" },
  "298": { bns: "302", title: "Uttering words etc. with deliberate intent to wound religious feelings", definition: "IPC Section 298 corresponds to BNS Section 302. Updated provisions.", status: "mapped" },
  "299": { bns: "100", title: "Culpable homicide", definition: "IPC Section 299 corresponds to BNS Section 100. Definition remains similar.", status: "mapped" },
  "300": { bns: "101", title: "Murder", definition: "IPC Section 300 corresponds to BNS Section 101. Definition largely unchanged.", status: "mapped" },
  "301": { bns: "102", title: "Culpable homicide by causing death of person other than person whose death was intended", definition: "IPC Section 301 corresponds to BNS Section 102. Updated provisions.", status: "mapped" },
  "302": { bns: "103", title: "Punishment for murder", definition: "Whoever commits murder shall be punished with death or imprisonment for life, and shall also be liable to fine.", status: "mapped" },
  "303": { bns: "104", title: "Punishment for murder by life-convict", definition: "IPC Section 303 corresponds to BNS Section 104. Retained with modifications.", status: "mapped" },
  "304": { bns: "105", title: "Punishment for culpable homicide not amounting to murder", definition: "Whoever commits culpable homicide not amounting to murder shall be punished with imprisonment for life, or imprisonment for a term up to 10 years with fine.", status: "mapped" },
  "304A": { bns: "106", title: "Causing death by negligence", definition: "IPC Section 304A corresponds to BNS Section 106. New provisions for medical practitioners added.", status: "modified" },
  "304B": { bns: "80", title: "Dowry death", definition: "IPC Section 304B corresponds to BNS Section 80. Moved to offences against women.", status: "mapped" },
  "305": { bns: "107", title: "Abetment of suicide of child or insane person", definition: "IPC Section 305 corresponds to BNS Section 107. Enhanced punishment.", status: "mapped" },
  "306": { bns: "108", title: "Abetment of suicide", definition: "IPC Section 306 corresponds to BNS Section 108. Updated provisions.", status: "mapped" },
  "307": { bns: "109", title: "Attempt to murder", definition: "Whoever does any act with intention or knowledge likely to cause death shall be punished with imprisonment up to 10 years with fine.", status: "mapped" },
  "308": { bns: "110", title: "Attempt to commit culpable homicide", definition: "IPC Section 308 corresponds to BNS Section 110. Updated provisions.", status: "mapped" },
  "309": { bns: null, title: "Attempt to commit suicide", definition: "This section has been repealed. Attempt to commit suicide is decriminalized under BNS.", status: "redacted" },
  "310": { bns: "111", title: "Thug", definition: "IPC Section 310 corresponds to BNS Section 111. Definition retained.", status: "mapped" },
  "311": { bns: "111", title: "Punishment for thuggee", definition: "IPC Section 311 corresponds to BNS Section 111. Consolidated with 310.", status: "mapped" },
  "312": { bns: "88", title: "Causing miscarriage", definition: "IPC Section 312 corresponds to BNS Section 88. Moved to offences against women.", status: "mapped" },
  "313": { bns: "89", title: "Causing miscarriage without woman's consent", definition: "IPC Section 313 corresponds to BNS Section 89. Moved to offences against women.", status: "mapped" },
  "314": { bns: "90", title: "Death of woman caused by act done with intent to cause miscarriage", definition: "IPC Section 314 corresponds to BNS Section 90. Moved to offences against women.", status: "mapped" },
  "315": { bns: "91", title: "Act done with intent to prevent child being born alive or to cause it to die after birth", definition: "IPC Section 315 corresponds to BNS Section 91. Moved to offences against women.", status: "mapped" },
  "316": { bns: "92", title: "Causing death of quick unborn child by act amounting to culpable homicide", definition: "IPC Section 316 corresponds to BNS Section 92. Moved to offences against women.", status: "mapped" },
  "317": { bns: "93", title: "Exposure and abandonment of child under twelve years by parent or person having care of it", definition: "IPC Section 317 corresponds to BNS Section 93. Moved to offences against children.", status: "mapped" },
  "318": { bns: "94", title: "Concealment of birth by secret disposal of dead body of child", definition: "IPC Section 318 corresponds to BNS Section 94. Updated provisions.", status: "mapped" },
  "319": { bns: "114", title: "Hurt", definition: "IPC Section 319 corresponds to BNS Section 114. Definition unchanged.", status: "mapped" },
  "320": { bns: "116", title: "Grievous hurt", definition: "IPC Section 320 corresponds to BNS Section 116. Same categories maintained.", status: "mapped" },
  "321": { bns: "115", title: "Voluntarily causing hurt", definition: "IPC Section 321 corresponds to BNS Section 115. Minor changes in punishment.", status: "mapped" },
  "322": { bns: "117", title: "Voluntarily causing grievous hurt", definition: "IPC Section 322 corresponds to BNS Section 117. Updated provisions.", status: "mapped" },
  "323": { bns: "115(2)", title: "Punishment for voluntarily causing hurt", definition: "IPC Section 323 corresponds to BNS Section 115(2). Now consolidated under section 115.", status: "mapped" },
  "324": { bns: "117(2)", title: "Voluntarily causing hurt by dangerous weapons or means", definition: "IPC Section 324 corresponds to BNS Section 117(2). Consolidated.", status: "mapped" },
  "325": { bns: "117(2)", title: "Punishment for voluntarily causing grievous hurt", definition: "IPC Section 325 corresponds to BNS Section 117(2). Updated.", status: "mapped" },
  "326": { bns: "118", title: "Voluntarily causing grievous hurt by dangerous weapons or means", definition: "IPC Section 326 corresponds to BNS Section 118. Enhanced punishments.", status: "mapped" },
  "326A": { bns: "124", title: "Voluntarily causing grievous hurt by use of acid etc.", definition: "IPC Section 326A corresponds to BNS Section 124. Retained with modifications.", status: "mapped" },
  "326B": { bns: "124(2)", title: "Voluntarily throwing or attempting to throw acid", definition: "IPC Section 326B corresponds to BNS Section 124(2). Now under section 124.", status: "mapped" },
  "327": { bns: "119", title: "Voluntarily causing hurt to extort property or to constrain to an illegal act", definition: "IPC Section 327 corresponds to BNS Section 119. Updated provisions.", status: "mapped" },
  "328": { bns: "120", title: "Causing hurt by means of poison etc. with intent to commit an offence", definition: "IPC Section 328 corresponds to BNS Section 120. Updated provisions.", status: "mapped" },
  "329": { bns: "121", title: "Voluntarily causing grievous hurt to extort property or to constrain to an illegal act", definition: "IPC Section 329 corresponds to BNS Section 121. Enhanced punishment.", status: "mapped" },
  "330": { bns: "122", title: "Voluntarily causing hurt to extort confession or to compel restoration of property", definition: "IPC Section 330 corresponds to BNS Section 122. Updated provisions.", status: "mapped" },
  "331": { bns: "123", title: "Voluntarily causing grievous hurt to extort confession or to compel restoration of property", definition: "IPC Section 331 corresponds to BNS Section 123. Enhanced punishment.", status: "mapped" },
  "332": { bns: "132", title: "Voluntarily causing hurt to deter public servant from his duty", definition: "IPC Section 332 corresponds to BNS Section 132. Updated provisions.", status: "mapped" },
  "333": { bns: "133", title: "Voluntarily causing grievous hurt to deter public servant from his duty", definition: "IPC Section 333 corresponds to BNS Section 133. Enhanced punishment.", status: "mapped" },
  "334": { bns: "125", title: "Voluntarily causing hurt on provocation", definition: "IPC Section 334 corresponds to BNS Section 125. Updated provisions.", status: "mapped" },
  "335": { bns: "126", title: "Voluntarily causing grievous hurt on provocation", definition: "IPC Section 335 corresponds to BNS Section 126. Updated provisions.", status: "mapped" },
  "336": { bns: "134", title: "Act endangering life or personal safety of others", definition: "IPC Section 336 corresponds to BNS Section 134. Updated provisions.", status: "mapped" },
  "337": { bns: "135", title: "Causing hurt by act endangering life or personal safety of others", definition: "IPC Section 337 corresponds to BNS Section 135. Updated provisions.", status: "mapped" },
  "338": { bns: "136", title: "Causing grievous hurt by act endangering life or personal safety of others", definition: "IPC Section 338 corresponds to BNS Section 136. Enhanced punishment.", status: "mapped" },
  "339": { bns: "126", title: "Wrongful restraint", definition: "IPC Section 339 corresponds to BNS Section 126. Definition similar.", status: "mapped" },
  "340": { bns: "126(2)", title: "Wrongful confinement", definition: "IPC Section 340 corresponds to BNS Section 126(2). Definition retained.", status: "mapped" },
  "341": { bns: "126(2)", title: "Punishment for wrongful restraint", definition: "IPC Section 341 corresponds to BNS Section 126(2). Consolidated.", status: "mapped" },
  "342": { bns: "127", title: "Punishment for wrongful confinement", definition: "IPC Section 342 corresponds to BNS Section 127. Updated provisions.", status: "mapped" },
  "343": { bns: "127(2)", title: "Wrongful confinement for three or more days", definition: "IPC Section 343 corresponds to BNS Section 127(2). Enhanced punishment.", status: "mapped" },
  "344": { bns: "127(3)", title: "Wrongful confinement for ten or more days", definition: "IPC Section 344 corresponds to BNS Section 127(3). Enhanced punishment.", status: "mapped" },
  "345": { bns: "127(4)", title: "Wrongful confinement of person for whose liberation writ has been issued", definition: "IPC Section 345 corresponds to BNS Section 127(4). Updated provisions.", status: "mapped" },
  "346": { bns: "128", title: "Wrongful confinement in secret", definition: "IPC Section 346 corresponds to BNS Section 128. Enhanced punishment.", status: "mapped" },
  "347": { bns: "129", title: "Wrongful confinement to extort property or constrain to illegal act", definition: "IPC Section 347 corresponds to BNS Section 129. Updated provisions.", status: "mapped" },
  "348": { bns: "130", title: "Wrongful confinement to extort confession or compel restoration of property", definition: "IPC Section 348 corresponds to BNS Section 130. Updated provisions.", status: "mapped" },
  "349": { bns: "128", title: "Force", definition: "IPC Section 349 corresponds to BNS Section 128. Definition retained.", status: "mapped" },
  "350": { bns: "128", title: "Criminal force", definition: "IPC Section 350 corresponds to BNS Section 128. Definition unchanged.", status: "mapped" },
  "351": { bns: "129", title: "Assault", definition: "IPC Section 351 corresponds to BNS Section 129. Definition similar.", status: "mapped" },
  "352": { bns: "131", title: "Punishment for assault or criminal force otherwise than on grave provocation", definition: "IPC Section 352 corresponds to BNS Section 131. Updated provisions.", status: "mapped" },
  "353": { bns: "132", title: "Assault or criminal force to deter public servant from discharge of his duty", definition: "IPC Section 353 corresponds to BNS Section 132. Enhanced punishment.", status: "mapped" },
  "354": { bns: "74", title: "Assault or criminal force to woman with intent to outrage her modesty", definition: "Whoever assaults or uses criminal force to any woman, intending to outrage or knowing it to be likely that he will thereby outrage her modesty, shall be punished with imprisonment for a term which shall not be less than one year but which may extend to five years, and shall also be liable to fine.", status: "mapped" },
  "354A": { bns: "75", title: "Sexual harassment and punishment for sexual harassment", definition: "IPC Section 354A corresponds to BNS Section 75. Retained under women offences.", status: "mapped" },
  "354B": { bns: "76", title: "Assault or use of criminal force to woman with intent to disrobe", definition: "IPC Section 354B corresponds to BNS Section 76. Retained under women offences.", status: "mapped" },
  "354C": { bns: "77", title: "Voyeurism", definition: "IPC Section 354C corresponds to BNS Section 77. Retained with modifications.", status: "mapped" },
  "354D": { bns: "78", title: "Stalking", definition: "IPC Section 354D corresponds to BNS Section 78. Retained under women offences.", status: "mapped" },
  "355": { bns: "131(2)", title: "Assault or criminal force with intent to dishonour person otherwise than on grave provocation", definition: "IPC Section 355 corresponds to BNS Section 131(2). Updated provisions.", status: "mapped" },
  "356": { bns: "131(3)", title: "Assault or criminal force in attempt to commit theft of property carried by a person", definition: "IPC Section 356 corresponds to BNS Section 131(3). Updated provisions.", status: "mapped" },
  "357": { bns: "131(4)", title: "Assault or criminal force in attempting wrongfully to confine a person", definition: "IPC Section 357 corresponds to BNS Section 131(4). Updated provisions.", status: "mapped" },
  "358": { bns: "131(5)", title: "Assault or criminal force on grave provocation", definition: "IPC Section 358 corresponds to BNS Section 131(5). Updated provisions.", status: "mapped" },
  "359": { bns: "137", title: "Kidnapping", definition: "IPC Section 359 corresponds to BNS Section 137. Definition largely same.", status: "mapped" },
  "360": { bns: "137(1)(a)", title: "Kidnapping from India", definition: "IPC Section 360 corresponds to BNS Section 137(1)(a). Consolidated.", status: "mapped" },
  "361": { bns: "137(1)(b)", title: "Kidnapping from lawful guardianship", definition: "IPC Section 361 corresponds to BNS Section 137(1)(b). Consolidated.", status: "mapped" },
  "362": { bns: "138", title: "Abduction", definition: "IPC Section 362 corresponds to BNS Section 138. Definition unchanged.", status: "mapped" },
  "363": { bns: "137(2)", title: "Punishment for kidnapping", definition: "IPC Section 363 corresponds to BNS Section 137(2). Updated punishment.", status: "mapped" },
  "363A": { bns: "139", title: "Kidnapping or maiming a minor for purposes of begging", definition: "IPC Section 363A corresponds to BNS Section 139. Enhanced punishment.", status: "mapped" },
  "363B": { bns: "95", title: "Kidnapping of woman to compel her marriage", definition: "IPC Section 363B corresponds to BNS Section 95. Gender neutral, moved to trafficking provisions.", status: "mapped" },
  "364": { bns: "140", title: "Kidnapping or abducting in order to murder", definition: "IPC Section 364 corresponds to BNS Section 140. Updated provisions.", status: "mapped" },
  "364A": { bns: "140(2)", title: "Kidnapping for ransom etc.", definition: "IPC Section 364A corresponds to BNS Section 140(2). Enhanced punishment — death penalty possible.", status: "mapped" },
  "365": { bns: "140(3)", title: "Kidnapping or abducting with intent secretly and wrongfully to confine person", definition: "IPC Section 365 corresponds to BNS Section 140(3). Updated provisions.", status: "mapped" },
  "366": { bns: "87", title: "Kidnapping, abducting or inducing woman to compel her marriage etc.", definition: "IPC Section 366 corresponds to BNS Section 87. Moved to marriage offences.", status: "mapped" },
  "366A": { bns: "96", title: "Procuration of minor girl", definition: "IPC Section 366A corresponds to BNS Section 96. Updated provisions.", status: "mapped" },
  "366B": { bns: "141", title: "Importation of girl from foreign country", definition: "IPC Section 366B corresponds to BNS Section 141. Gender neutral provisions.", status: "mapped" },
  "367": { bns: "142", title: "Kidnapping or abducting in order to subject person to grievous hurt, slavery etc.", definition: "IPC Section 367 corresponds to BNS Section 142. Consolidated.", status: "mapped" },
  "368": { bns: "143", title: "Wrongfully concealing or keeping in confinement kidnapped or abducted person", definition: "IPC Section 368 corresponds to BNS Section 143. Now trafficking provisions.", status: "mapped" },
  "369": { bns: "143", title: "Kidnapping or abducting child under ten years with intent to steal from its person", definition: "IPC Section 369 corresponds to BNS Section 143. Consolidated with trafficking.", status: "mapped" },
  "370": { bns: "143", title: "Trafficking of person", definition: "IPC Section 370 corresponds to BNS Section 143. Comprehensive trafficking law retained.", status: "mapped" },
  "370A": { bns: "144", title: "Exploitation of a trafficked person", definition: "IPC Section 370A corresponds to BNS Section 144. New provisions for exploitation of trafficking victims.", status: "modified" },
  "371": { bns: "145", title: "Habitual dealing in slaves", definition: "IPC Section 371 corresponds to BNS Section 145. Updated provisions.", status: "mapped" },
  "372": { bns: "96", title: "Selling minor for purposes of prostitution etc.", definition: "IPC Section 372 corresponds to BNS Section 96. Consolidated with procuration provisions.", status: "mapped" },
  "373": { bns: "96", title: "Buying minor for purposes of prostitution etc.", definition: "IPC Section 373 corresponds to BNS Section 96. Consolidated with procuration provisions.", status: "mapped" },
  "374": { bns: "146", title: "Unlawful compulsory labour", definition: "IPC Section 374 corresponds to BNS Section 146. Updated provisions.", status: "mapped" },
  "375": { bns: "63", title: "Rape", definition: "IPC Section 375 corresponds to BNS Section 63. Definition expanded to include more acts of penetration.", status: "modified" },
  "376": { bns: "64", title: "Punishment for rape", definition: "Whoever commits rape shall be punished with rigorous imprisonment for a term not less than 10 years which may extend to imprisonment for life, and shall also be liable to fine.", status: "mapped" },
  "376A": { bns: "66", title: "Punishment for causing death or resulting in persistent vegetative state of victim", definition: "IPC Section 376A corresponds to BNS Section 66. Specific provision — life imprisonment or death penalty.", status: "mapped" },
  "376AB": { bns: "65", title: "Punishment for rape on woman under sixteen years of age", definition: "IPC Section 376AB corresponds to BNS Section 65. Age-specific provisions — minimum 20 years.", status: "mapped" },
  "376B": { bns: "67", title: "Sexual intercourse by husband upon his wife during separation", definition: "IPC Section 376B corresponds to BNS Section 67. Retained.", status: "mapped" },
  "376C": { bns: "68", title: "Sexual intercourse by a person in authority", definition: "IPC Section 376C corresponds to BNS Section 68. Expanded scope.", status: "modified" },
  "376D": { bns: "70", title: "Gang rape", definition: "IPC Section 376D corresponds to BNS Section 70. Enhanced punishment — minimum 20 years rigorous imprisonment.", status: "mapped" },
  "376E": { bns: "71", title: "Punishment for repeat offenders", definition: "IPC Section 376E corresponds to BNS Section 71. Life imprisonment or death penalty for repeat offenders.", status: "mapped" },
  "377": { bns: null, title: "Unnatural offences", definition: "This section has been struck down by the Supreme Court of India in 2018 (Navtej Singh Johar v. Union of India) to the extent it criminalizes consensual sexual acts between adults.", status: "redacted" },
  "378": { bns: "303", title: "Theft", definition: "IPC Section 378 corresponds to BNS Section 303. Definition unchanged.", status: "mapped" },
  "379": { bns: "303(2)", title: "Punishment for theft", definition: "Whoever commits theft shall be punished with imprisonment up to 3 years or fine or both.", status: "mapped" },
  "380": { bns: "305", title: "Theft in dwelling house etc.", definition: "Whoever commits theft in any building, tent or vessel used as a human dwelling shall be punished with imprisonment up to 7 years and fine.", status: "mapped" },
  "381": { bns: "306", title: "Theft by clerk or servant of property in possession of master", definition: "IPC Section 381 corresponds to BNS Section 306. Updated provisions.", status: "mapped" },
  "382": { bns: "307", title: "Theft after preparation made for causing death, hurt or restraint in order to the committing of the theft", definition: "IPC Section 382 corresponds to BNS Section 307. Enhanced punishment.", status: "mapped" },
  "383": { bns: "308", title: "Extortion", definition: "IPC Section 383 corresponds to BNS Section 308. Definition similar.", status: "mapped" },
  "384": { bns: "308(2)", title: "Punishment for extortion", definition: "IPC Section 384 corresponds to BNS Section 308(2). Updated punishment.", status: "mapped" },
  "385": { bns: "308(3)", title: "Putting person in fear of injury in order to commit extortion", definition: "IPC Section 385 corresponds to BNS Section 308(3). Consolidated.", status: "mapped" },
  "386": { bns: "308(4)", title: "Extortion by putting a person in fear of death or grievous hurt", definition: "IPC Section 386 corresponds to BNS Section 308(4). Enhanced punishment.", status: "mapped" },
  "387": { bns: "308(5)", title: "Putting person in fear of death or of grievous hurt in order to commit extortion", definition: "IPC Section 387 corresponds to BNS Section 308(5). Enhanced punishment.", status: "mapped" },
  "388": { bns: "308(6)", title: "Extortion by threat of accusation of an offence punishable with death or imprisonment for life", definition: "IPC Section 388 corresponds to BNS Section 308(6). Updated provisions.", status: "mapped" },
  "389": { bns: "308(7)", title: "Putting person in fear of accusation of offence in order to commit extortion", definition: "IPC Section 389 corresponds to BNS Section 308(7). Updated provisions.", status: "mapped" },
  "390": { bns: "309", title: "Robbery", definition: "IPC Section 390 corresponds to BNS Section 309. Definition unchanged.", status: "mapped" },
  "391": { bns: "309(2)", title: "Dacoity", definition: "IPC Section 391 corresponds to BNS Section 309(2). Definition unchanged — 5 or more persons.", status: "mapped" },
  "392": { bns: "309(4)", title: "Punishment for robbery", definition: "IPC Section 392 corresponds to BNS Section 309(4). Enhanced punishment.", status: "mapped" },
  "393": { bns: "309(5)", title: "Attempt to commit robbery", definition: "IPC Section 393 corresponds to BNS Section 309(5). Updated provisions.", status: "mapped" },
  "394": { bns: "309(6)", title: "Voluntarily causing hurt in committing robbery", definition: "IPC Section 394 corresponds to BNS Section 309(6). Enhanced punishment.", status: "mapped" },
  "395": { bns: "310", title: "Punishment for dacoity", definition: "IPC Section 395 corresponds to BNS Section 310. Life imprisonment provisions.", status: "mapped" },
  "396": { bns: "310(3)", title: "Dacoity with murder", definition: "IPC Section 396 corresponds to BNS Section 310(3). Death penalty or life imprisonment.", status: "mapped" },
  "397": { bns: "311", title: "Robbery or dacoity with attempt to cause death or grievous hurt", definition: "IPC Section 397 corresponds to BNS Section 311. Enhanced punishment.", status: "mapped" },
  "398": { bns: "312", title: "Attempt to commit robbery or dacoity when armed with deadly weapon", definition: "IPC Section 398 corresponds to BNS Section 312. Updated provisions.", status: "mapped" },
  "399": { bns: "310(4)", title: "Making preparation to commit dacoity", definition: "IPC Section 399 corresponds to BNS Section 310(4). Updated provisions.", status: "mapped" },
  "400": { bns: "310(5)", title: "Punishment for belonging to gang of dacoits", definition: "IPC Section 400 corresponds to BNS Section 310(5). Enhanced punishment.", status: "mapped" },
  "401": { bns: "310(6)", title: "Punishment for belonging to gang of thieves", definition: "IPC Section 401 corresponds to BNS Section 310(6). Updated provisions.", status: "mapped" },
  "402": { bns: "310(7)", title: "Assembling for purpose of committing dacoity", definition: "IPC Section 402 corresponds to BNS Section 310(7). Updated provisions.", status: "mapped" },
  "403": { bns: "314", title: "Dishonest misappropriation of property", definition: "IPC Section 403 corresponds to BNS Section 314. Updated punishment.", status: "mapped" },
  "404": { bns: "315", title: "Dishonest misappropriation of property possessed by deceased person at the time of his death", definition: "IPC Section 404 corresponds to BNS Section 315. Updated provisions.", status: "mapped" },
  "405": { bns: "316", title: "Criminal breach of trust", definition: "IPC Section 405 corresponds to BNS Section 316. Definition unchanged.", status: "mapped" },
  "406": { bns: "316(2)", title: "Punishment for criminal breach of trust", definition: "Whoever commits criminal breach of trust shall be punished with imprisonment up to 3 years or fine or both.", status: "mapped" },
  "407": { bns: "316(3)", title: "Criminal breach of trust by carrier etc.", definition: "IPC Section 407 corresponds to BNS Section 316(3). Updated provisions.", status: "mapped" },
  "408": { bns: "316(4)", title: "Criminal breach of trust by clerk or servant", definition: "IPC Section 408 corresponds to BNS Section 316(4). Enhanced punishment.", status: "mapped" },
  "409": { bns: "316(5)", title: "Criminal breach of trust by public servant or by banker, merchant or agent", definition: "IPC Section 409 corresponds to BNS Section 316(5). Life imprisonment possible.", status: "mapped" },
  "410": { bns: "317", title: "Stolen property", definition: "IPC Section 410 corresponds to BNS Section 317. Definition similar.", status: "mapped" },
  "411": { bns: "317(2)", title: "Dishonestly receiving stolen property", definition: "IPC Section 411 corresponds to BNS Section 317(2). Updated punishment.", status: "mapped" },
  "412": { bns: "317(3)", title: "Dishonestly receiving property stolen in the commission of a dacoity", definition: "IPC Section 412 corresponds to BNS Section 317(3). Enhanced punishment.", status: "mapped" },
  "413": { bns: "317(4)", title: "Habitually dealing in stolen property", definition: "IPC Section 413 corresponds to BNS Section 317(4). Life imprisonment possible.", status: "mapped" },
  "414": { bns: "317(5)", title: "Assisting in concealment of stolen property", definition: "IPC Section 414 corresponds to BNS Section 317(5). Updated provisions.", status: "mapped" },
  "415": { bns: "318", title: "Cheating", definition: "IPC Section 415 corresponds to BNS Section 318. Definition expanded for digital frauds.", status: "modified" },
  "416": { bns: "319", title: "Cheating by personation", definition: "IPC Section 416 corresponds to BNS Section 319. Updated provisions.", status: "mapped" },
  "417": { bns: "318(2)", title: "Punishment for cheating", definition: "Whoever cheats shall be punished with imprisonment up to 1 year or fine or both.", status: "mapped" },
  "418": { bns: "318(3)", title: "Cheating with knowledge that wrongful loss may ensue to person whose interest offender is bound to protect", definition: "IPC Section 418 corresponds to BNS Section 318(3). Consolidated.", status: "mapped" },
  "419": { bns: "319(2)", title: "Punishment for cheating by personation", definition: "IPC Section 419 corresponds to BNS Section 319(2). Enhanced punishment.", status: "mapped" },
  "420": { bns: "318(4)", title: "Cheating and dishonestly inducing delivery of property", definition: "Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person shall be punished with imprisonment up to 7 years and fine.", status: "mapped" },
  "421": { bns: "320", title: "Dishonest or fraudulent removal or concealment of property to prevent distribution among creditors", definition: "IPC Section 421 corresponds to BNS Section 320. Updated provisions.", status: "mapped" },
  "422": { bns: "321", title: "Dishonestly or fraudulently preventing a debt or demand due to the offender from being available for his creditors", definition: "IPC Section 422 corresponds to BNS Section 321. Updated provisions.", status: "mapped" },
  "423": { bns: "322", title: "Dishonest or fraudulent execution of deed of transfer containing false statement of consideration", definition: "IPC Section 423 corresponds to BNS Section 322. Updated provisions.", status: "mapped" },
  "424": { bns: "323", title: "Dishonest or fraudulent removal or concealment of property", definition: "IPC Section 424 corresponds to BNS Section 323. Updated provisions.", status: "mapped" },
  "425": { bns: "324", title: "Mischief", definition: "IPC Section 425 corresponds to BNS Section 324. Definition unchanged.", status: "mapped" },
  "426": { bns: "324(2)", title: "Punishment for mischief", definition: "IPC Section 426 corresponds to BNS Section 324(2). Updated punishment.", status: "mapped" },
  "427": { bns: "324(3)", title: "Mischief causing damage to the amount of fifty rupees", definition: "IPC Section 427 corresponds to BNS Section 324(3). Amount updated for inflation.", status: "mapped" },
  "428": { bns: "325", title: "Mischief by killing or maiming animal of the value of ten rupees", definition: "IPC Section 428 corresponds to BNS Section 325. Enhanced punishment.", status: "mapped" },
  "429": { bns: "325", title: "Mischief by killing or maiming cattle etc. of any value or any animal of the value of fifty rupees", definition: "IPC Section 429 corresponds to BNS Section 325. Consolidated with 428.", status: "mapped" },
  "430": { bns: "326(a)", title: "Mischief by injury to works of irrigation or by wrongfully diverting water", definition: "IPC Section 430 corresponds to BNS Section 326(a). Updated provisions.", status: "mapped" },
  "431": { bns: "326(b)", title: "Mischief by injury to public road, bridge, river or channel", definition: "IPC Section 431 corresponds to BNS Section 326(b). Updated provisions.", status: "mapped" },
  "432": { bns: "326(c)", title: "Mischief by causing inundation or obstruction to public drainage attended with damage", definition: "IPC Section 432 corresponds to BNS Section 326(c). Updated provisions.", status: "mapped" },
  "433": { bns: "326(d)", title: "Mischief by destroying, moving or rendering less useful a light-house or sea-mark", definition: "IPC Section 433 corresponds to BNS Section 326(d). Updated provisions.", status: "mapped" },
  "434": { bns: "326(e)", title: "Mischief by destroying or moving etc. a land-mark fixed by public authority", definition: "IPC Section 434 corresponds to BNS Section 326(e). Updated provisions.", status: "mapped" },
  "435": { bns: "326(f)", title: "Mischief by fire or explosive substance with intent to cause damage to amount of one hundred rupees", definition: "IPC Section 435 corresponds to BNS Section 326(f). Enhanced punishment.", status: "mapped" },
  "436": { bns: "326(g)", title: "Mischief by fire or explosive substance with intent to destroy house etc.", definition: "IPC Section 436 corresponds to BNS Section 326(g). Life imprisonment possible.", status: "mapped" },
  "437": { bns: "327", title: "Mischief with intent to destroy or make unsafe a decked vessel or one of twenty tons burden", definition: "IPC Section 437 corresponds to BNS Section 327. Updated provisions.", status: "mapped" },
  "438": { bns: "327", title: "Punishment for the mischief described in section 437 committed by fire or explosive substance", definition: "IPC Section 438 corresponds to BNS Section 327. Consolidated with 437.", status: "mapped" },
  "439": { bns: "328", title: "Mischief by secretly destroying or moving a landmark fixed by authority of a public servant", definition: "IPC Section 439 corresponds to BNS Section 328. Updated provisions.", status: "mapped" },
  "440": { bns: "328", title: "Mischief committed after preparation made for causing death or hurt", definition: "IPC Section 440 corresponds to BNS Section 328. Consolidated.", status: "mapped" },
  "441": { bns: "329", title: "Criminal trespass", definition: "IPC Section 441 corresponds to BNS Section 329. Definition unchanged.", status: "mapped" },
  "442": { bns: "329(2)", title: "House-trespass", definition: "IPC Section 442 corresponds to BNS Section 329(2). Definition similar.", status: "mapped" },
  "443": { bns: "330", title: "Lurking house-trespass", definition: "IPC Section 443 corresponds to BNS Section 330. Updated provisions.", status: "mapped" },
  "444": { bns: "331", title: "Lurking house-trespass by night", definition: "IPC Section 444 corresponds to BNS Section 331. Enhanced punishment.", status: "mapped" },
  "445": { bns: "330(2)", title: "House-breaking", definition: "IPC Section 445 corresponds to BNS Section 330(2). Definition updated.", status: "mapped" },
  "446": { bns: "331", title: "House-breaking by night", definition: "IPC Section 446 corresponds to BNS Section 331. Enhanced punishment.", status: "mapped" },
  "447": { bns: "329(3)", title: "Punishment for criminal trespass", definition: "IPC Section 447 corresponds to BNS Section 329(3). Updated punishment.", status: "mapped" },
  "448": { bns: "329(4)", title: "Punishment for house-trespass", definition: "IPC Section 448 corresponds to BNS Section 329(4). Updated punishment.", status: "mapped" },
  "449": { bns: "332(a)", title: "House-trespass in order to commit offence punishable with death", definition: "IPC Section 449 corresponds to BNS Section 332(a). Life imprisonment possible.", status: "mapped" },
  "450": { bns: "332(b)", title: "House-trespass in order to commit offence punishable with imprisonment for life", definition: "IPC Section 450 corresponds to BNS Section 332(b). Enhanced punishment.", status: "mapped" },
  "451": { bns: "332(c)", title: "House-trespass in order to commit offence punishable with imprisonment", definition: "IPC Section 451 corresponds to BNS Section 332(c). Updated provisions.", status: "mapped" },
  "452": { bns: "333", title: "House-trespass after preparation for hurt, assault or wrongful restraint", definition: "IPC Section 452 corresponds to BNS Section 333. Enhanced punishment.", status: "mapped" },
  "453": { bns: "331", title: "Punishment for lurking house-trespass or house-breaking", definition: "IPC Section 453 corresponds to BNS Section 331. Updated punishment.", status: "mapped" },
  "454": { bns: "331(3)", title: "Lurking house-trespass or house-breaking in order to commit offence punishable with imprisonment", definition: "IPC Section 454 corresponds to BNS Section 331(3). Enhanced punishment.", status: "mapped" },
  "455": { bns: "331(5)", title: "Lurking house-trespass or house-breaking after preparation for hurt, assault or wrongful restraint", definition: "IPC Section 455 corresponds to BNS Section 331(5). Enhanced punishment.", status: "mapped" },
  "456": { bns: "331(2)", title: "Lurking house-trespass or house-breaking by night", definition: "IPC Section 456 corresponds to BNS Section 331(2). Enhanced punishment.", status: "mapped" },
  "457": { bns: "331(4)", title: "Lurking house-trespass or house-breaking by night in order to commit offence punishable with imprisonment", definition: "IPC Section 457 corresponds to BNS Section 331(4). Enhanced punishment.", status: "mapped" },
  "458": { bns: "331(6)", title: "Lurking house-trespass or house-breaking by night after preparation for hurt, assault or wrongful restraint", definition: "IPC Section 458 corresponds to BNS Section 331(6). Enhanced punishment.", status: "mapped" },
  "459": { bns: "331(7)", title: "Grievous hurt caused whilst committing lurking house-trespass or house-breaking", definition: "IPC Section 459 corresponds to BNS Section 331(7). Life imprisonment possible.", status: "mapped" },
  "460": { bns: "331(8)", title: "All persons jointly concerned in lurking house-trespass or house-breaking by night punishable where death or grievous hurt caused by one of them", definition: "IPC Section 460 corresponds to BNS Section 331(8). Life imprisonment or death penalty.", status: "mapped" },
  "461": { bns: "334", title: "Dishonestly breaking open receptacle containing property", definition: "IPC Section 461 corresponds to BNS Section 334. Updated provisions.", status: "mapped" },
  "462": { bns: "335", title: "Punishment for same offence when committed by person entrusted with custody", definition: "IPC Section 462 corresponds to BNS Section 335. Updated punishment.", status: "mapped" },
  "463": { bns: "336", title: "Forgery", definition: "Whoever makes any false document or electronic record with intent to cause damage or injury shall be punished with imprisonment up to 2 years or fine or both.", status: "modified" },
  "464": { bns: "335", title: "Making a false document", definition: "IPC Section 464 corresponds to BNS Section 335. Includes electronic records.", status: "mapped" },
  "465": { bns: "336(2)", title: "Punishment for forgery", definition: "Whoever commits forgery shall be punished with imprisonment up to 2 years or fine or both.", status: "mapped" },
  "466": { bns: "337", title: "Forgery of record of Court or of public register etc.", definition: "IPC Section 466 corresponds to BNS Section 337. Enhanced punishment, includes Aadhaar records.", status: "mapped" },
  "467": { bns: "338", title: "Forgery of valuable security, will etc.", definition: "IPC Section 467 corresponds to BNS Section 338. Life imprisonment possible.", status: "mapped" },
  "468": { bns: "336(3)", title: "Forgery for purpose of cheating", definition: "IPC Section 468 corresponds to BNS Section 336(3). Enhanced punishment.", status: "mapped" },
  "469": { bns: "336(4)", title: "Forgery for purpose of harming reputation", definition: "IPC Section 469 corresponds to BNS Section 336(4). Updated provisions.", status: "mapped" },
  "470": { bns: "340", title: "Forged document or electronic record", definition: "IPC Section 470 corresponds to BNS Section 340. Includes electronic records.", status: "mapped" },
  "471": { bns: "340(2)", title: "Using as genuine a forged document or electronic record", definition: "IPC Section 471 corresponds to BNS Section 340(2). Updated punishment.", status: "mapped" },
  "472": { bns: "341", title: "Making or possessing counterfeit seal etc. with intent to commit forgery punishable under section 467", definition: "IPC Section 472 corresponds to BNS Section 341. Enhanced punishment.", status: "mapped" },
  "473": { bns: "341(2)", title: "Making or possessing counterfeit seal etc. with intent to commit forgery punishable otherwise", definition: "IPC Section 473 corresponds to BNS Section 341(2). Updated provisions.", status: "mapped" },
  "474": { bns: "342", title: "Having possession of document described in sections 466 or 467 knowing it to be forged and intending to use it as genuine", definition: "IPC Section 474 corresponds to BNS Section 342. Updated provisions.", status: "mapped" },
  "475": { bns: "342", title: "Counterfeiting device or mark used for authenticating documents described in section 467", definition: "IPC Section 475 corresponds to BNS Section 342. Includes electronic signatures.", status: "mapped" },
  "476": { bns: "342(2)", title: "Counterfeiting device or mark used for authenticating documents other than those described in section 467", definition: "IPC Section 476 corresponds to BNS Section 342(2). Updated provisions.", status: "mapped" },
  "477": { bns: "338", title: "Fraudulent cancellation, destruction etc. of will", definition: "IPC Section 477 corresponds to BNS Section 338. Consolidated.", status: "mapped" },
  "477A": { bns: "338", title: "Falsification of accounts", definition: "IPC Section 477A corresponds to BNS Section 338. Enhanced for corporate frauds.", status: "mapped" },
  "478": { bns: "343", title: "Trade mark", definition: "IPC Section 478 corresponds to BNS Section 343. Definition retained.", status: "mapped" },
  "479": { bns: "344", title: "Property mark", definition: "IPC Section 479 corresponds to BNS Section 344. Definition retained.", status: "mapped" },
  "480": { bns: "345", title: "Using a false trade mark", definition: "IPC Section 480 corresponds to BNS Section 345. Updated provisions.", status: "mapped" },
  "481": { bns: "346", title: "Using a false property mark", definition: "IPC Section 481 corresponds to BNS Section 346. Updated provisions.", status: "mapped" },
  "482": { bns: "347", title: "Punishment for using a false trade mark or property mark", definition: "IPC Section 482 corresponds to BNS Section 347. Updated punishment.", status: "mapped" },
  "483": { bns: "348", title: "Counterfeiting a trade mark or property mark used by another", definition: "IPC Section 483 corresponds to BNS Section 348. Updated provisions.", status: "mapped" },
  "484": { bns: "349", title: "Counterfeiting a property mark used by a public servant", definition: "IPC Section 484 corresponds to BNS Section 349. Updated provisions.", status: "mapped" },
  "485": { bns: "350", title: "Making or possession of any instrument for counterfeiting a trade mark or property mark", definition: "IPC Section 485 corresponds to BNS Section 350. Updated provisions.", status: "mapped" },
  "486": { bns: "350", title: "Selling goods marked with a counterfeit trade mark", definition: "IPC Section 486 corresponds to BNS Section 350. Consolidated.", status: "mapped" },
  "487": { bns: "350", title: "Making a false mark upon any receptacle containing goods", definition: "IPC Section 487 corresponds to BNS Section 350. Consolidated.", status: "mapped" },
  "488": { bns: "350", title: "Punishment for making use of any such false mark", definition: "IPC Section 488 corresponds to BNS Section 350. Consolidated.", status: "mapped" },
  "489": { bns: "350", title: "Tampering with property mark with intent to cause injury", definition: "IPC Section 489 corresponds to BNS Section 350. Consolidated.", status: "mapped" },
  "489A": { bns: "336", title: "Counterfeiting currency-notes or bank-notes", definition: "IPC Section 489A corresponds to BNS Section 336. Enhanced punishment for currency crimes.", status: "mapped" },
  "489B": { bns: "336", title: "Using as genuine, forged or counterfeit currency-notes or bank-notes", definition: "IPC Section 489B corresponds to BNS Section 336. Consolidated.", status: "mapped" },
  "489C": { bns: "336", title: "Possession of forged or counterfeit currency-notes or bank-notes", definition: "IPC Section 489C corresponds to BNS Section 336. Consolidated.", status: "mapped" },
  "489D": { bns: "336", title: "Making or possessing instruments or materials for forging or counterfeiting currency-notes or bank-notes", definition: "IPC Section 489D corresponds to BNS Section 336. Consolidated.", status: "mapped" },
  "489E": { bns: "336", title: "Making or using documents resembling currency-notes or bank-notes", definition: "IPC Section 489E corresponds to BNS Section 336. Consolidated.", status: "mapped" },
  "493": { bns: "81", title: "Cohabitation caused by a man deceitfully inducing a belief of lawful marriage", definition: "IPC Section 493 corresponds to BNS Section 81. Updated provisions.", status: "mapped" },
  "494": { bns: "82", title: "Marrying again during lifetime of husband or wife", definition: "Whoever having a husband or wife living marries again shall be punished with imprisonment up to 7 years and fine.", status: "mapped" },
  "495": { bns: "83", title: "Same offence with concealment of former marriage from person with whom subsequent marriage is contracted", definition: "IPC Section 495 corresponds to BNS Section 83. Enhanced punishment.", status: "mapped" },
  "496": { bns: "84", title: "Marriage ceremony fraudulently gone through without lawful marriage", definition: "IPC Section 496 corresponds to BNS Section 84. Updated provisions.", status: "mapped" },
  "497": { bns: null, title: "Adultery", definition: "This section has been struck down by the Supreme Court of India in 2018 (Joseph Shine v. Union of India). Adultery is no longer a criminal offence.", status: "redacted" },
  "498": { bns: "85", title: "Enticing or taking away or detaining with criminal intent a married woman", definition: "IPC Section 498 corresponds to BNS Section 85. Updated provisions.", status: "mapped" },
  "498A": { bns: "86", title: "Husband or relative of husband of a woman subjecting her to cruelty", definition: "Whoever, being the husband or the relative of the husband of a woman, subjects such woman to cruelty shall be punished with imprisonment up to 3 years and fine.", status: "mapped" },
  "499": { bns: "356", title: "Defamation", definition: "Whoever by words spoken or intended to be read makes or publishes any imputation concerning any person intending to harm reputation shall be guilty of defamation.", status: "mapped" },
  "500": { bns: "356(2)", title: "Punishment for defamation", definition: "IPC Section 500 corresponds to BNS Section 356(2). Updated, community service option added.", status: "mapped" },
  "501": { bns: "356(3)", title: "Printing or engraving matter known to be defamatory", definition: "IPC Section 501 corresponds to BNS Section 356(3). Consolidated.", status: "mapped" },
  "502": { bns: "356(4)", title: "Sale of printed or engraved substance containing defamatory matter", definition: "IPC Section 502 corresponds to BNS Section 356(4). Consolidated.", status: "mapped" },
  "503": { bns: "351", title: "Criminal intimidation", definition: "Whoever threatens another with injury to person, reputation or property with intent to cause alarm shall be punished with imprisonment up to 2 years or fine or both.", status: "mapped" },
  "504": { bns: "352", title: "Intentional insult with intent to provoke breach of the peace", definition: "IPC Section 504 corresponds to BNS Section 352. Updated provisions.", status: "mapped" },
  "505": { bns: "353", title: "Statements conducing to public mischief", definition: "IPC Section 505 corresponds to BNS Section 353. Includes electronic means and fake news.", status: "modified" },
  "506": { bns: "351(2)", title: "Punishment for criminal intimidation", definition: "Whoever commits criminal intimidation shall be punished with imprisonment up to 2 years or fine or both, or if threat is to cause death or grievous hurt, up to 7 years or fine or both.", status: "mapped" },
  "507": { bns: "351(4)", title: "Criminal intimidation by an anonymous communication", definition: "IPC Section 507 corresponds to BNS Section 351(4). Consolidated, covers digital and anonymous threats.", status: "mapped" },
  "508": { bns: "354", title: "Act caused by inducing person to believe that he will be rendered an object of the Divine displeasure", definition: "IPC Section 508 corresponds to BNS Section 354. Updated provisions.", status: "mapped" },
  "509": { bns: "79", title: "Word, gesture or act intended to insult the modesty of a woman", definition: "Whoever intends to insult the modesty of any woman utters any word, makes any gesture or exhibits any object shall be punished with imprisonment up to 3 years or fine or both.", status: "mapped" },
  "510": { bns: "355", title: "Misconduct in public by a drunken person", definition: "IPC Section 510 corresponds to BNS Section 355. Community service option added.", status: "mapped" },
  "511": { bns: "62", title: "Punishment for attempting to commit offences punishable with imprisonment for life or other imprisonment", definition: "IPC Section 511 corresponds to BNS Section 62. General provision for attempts — enhanced scope.", status: "mapped" },
  "120B": { bns: "61", title: "Punishment of criminal conspiracy", definition: "Whoever is a party to a criminal conspiracy shall be punished with imprisonment up to 6 months or fine or both, or if the conspiracy is for a serious offense, with the punishment prescribed for that offense.", status: "mapped" },
};
export default function IPCToBNSMapper() {
  const [inputSection, setInputSection] = useState("");
  const [result, setResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("recentIPCSearches");
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  const handleSearch = () => {
    if (!inputSection.trim()) return;

    setIsSearching(true);

    // Simulate search delay for smooth UX
    setTimeout(() => {
      const mapping = IPC_TO_BNS_MAP[inputSection.trim()];

      if (mapping) {
        setResult({
          ipc: inputSection.trim(),
          ...mapping
        });

        // Add to recent searches
        const updated = [inputSection.trim(), ...recentSearches.filter(s => s !== inputSection.trim())].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem("recentIPCSearches", JSON.stringify(updated));
      } else {
        setResult({
          ipc: inputSection.trim(),
          bns: null,
          title: "Section not found",
          definition: "This IPC section is not available in our database. Please verify the section number or check if it exists.",
          status: "redacted"
        });
      }

      setIsSearching(false);
    }, 600);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRecentClick = (section: string) => {
    setInputSection(section);
    setResult(null);
  };

  return (
    <div className="min-h-screen h-screen bg-black p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto pb-8">

        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <Scale className="w-10 h-10 text-blue-500" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent" style={{ fontFamily: "'Product Sans', 'Segoe UI', sans-serif" }}>
              IPC → BNS Mapper
            </h1>
          </div>
          <p className="text-slate-400 text-lg">Translate Indian Penal Code sections to Bharatiya Nyaya Sanhita instantly</p>
        </div>

        {/* Main Translator Box */}
        <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-700">

          {/* Input Section */}
          <div className="p-8 border-b border-slate-700">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 bg-slate-800 px-4 py-2 rounded-full border border-slate-700">
                <BookOpen className="w-4 h-4" />
                Indian Penal Code (IPC)
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                value={inputSection}
                onChange={(e) => setInputSection(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Enter IPC Section (e.g., 302, 420, 376)"
                className="w-full text-2xl font-medium text-white placeholder:text-slate-500 border-none outline-none bg-transparent"
                style={{ fontFamily: "'Product Sans', 'Segoe UI', sans-serif" }}
              />

              {inputSection && (
                <button
                  onClick={() => setInputSection("")}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Recent Searches */}
            {recentSearches.length > 0 && !result && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs text-slate-500 mr-2">Recent:</span>
                {recentSearches.map((section) => (
                  <button
                    key={section}
                    onClick={() => handleRecentClick(section)}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-full transition-colors border border-slate-700"
                  >
                    {section}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Translate Button */}
          <div className="flex items-center justify-center py-6 bg-slate-800">
            <button
              onClick={handleSearch}
              disabled={!inputSection.trim() || isSearching}
              className="group flex items-center gap-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white font-semibold px-8 py-4 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:shadow-none"
            >
              {isSearching ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Mapping...
                </>
              ) : (
                <>
                  <ArrowLeftRight className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                  Map to BNS
                </>
              )}
            </button>
          </div>

          {/* Output Section */}
          <div className="p-8 bg-slate-800 min-h-[300px]">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 bg-slate-900 px-4 py-2 rounded-full mb-4 w-fit border border-slate-700">
              <FileText className="w-4 h-4" />
              Bharatiya Nyaya Sanhita (BNS)
            </div>

            {result ? (
              <div className="space-y-6 animate-fadeIn">
                {/* BNS Section Display */}
                <div className="bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-700">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                        IPC {result.ipc}
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-500" />
                      <div className="text-sm font-bold text-blue-400 bg-slate-800 px-3 py-1 rounded-full border border-blue-500/30">
                        {result.bns ? `BNS ${result.bns}` : "REDACTED"}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className={`text-xs font-semibold px-3 py-1 rounded-full ${result.status === "mapped" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                        result.status === "modified" ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
                          "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}>
                      {result.status === "mapped" ? "✓ Mapped" :
                        result.status === "modified" ? "⚠ Modified" :
                          "✕ Redacted"}
                    </div>
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Product Sans', 'Segoe UI', sans-serif" }}>
                    {result.title}
                  </h3>

                  {result.bns && (
                    <button
                      onClick={() => handleCopy(`BNS ${result.bns}`)}
                      className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy BNS Section
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Definition Section */}
                <div className="bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-700">
                  <div className="flex items-center gap-2 mb-3 text-slate-300">
                    <Info className="w-5 h-5" />
                    <h4 className="font-semibold text-lg">Definition & Punishment</h4>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    {result.definition}
                  </p>
                </div>

                {/* Alert for Redacted Sections */}
                {result.status === "redacted" && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-red-400 mb-1">Section Redacted</h4>
                      <p className="text-sm text-red-300/80">
                        This IPC section has been removed or significantly modified in the Bharatiya Nyaya Sanhita.
                        Please refer to the definition for details on the changes.
                      </p>
                    </div>
                  </div>
                )}

                {/* Alert for Modified Sections */}
                {result.status === "modified" && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-yellow-400 mb-1">Section Modified</h4>
                      <p className="text-sm text-yellow-300/80">
                        This section has been modified in the BNS with updated language or scope.
                        Review the definition carefully for changes.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <Scale className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg">Enter an IPC section to see its BNS equivalent</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Reference */}
        <div className="mt-8 bg-slate-900 rounded-xl p-6 shadow-lg border border-slate-700">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            Quick Reference - Popular Sections
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["302", "420", "376", "354", "498A", "379", "124A", "377"].map((section) => (
              <button
                key={section}
                onClick={() => {
                  setInputSection(section);
                  setResult(null);
                }}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg p-3 text-left transition-all hover:shadow-md hover:border-blue-500/50"
              >
                <div className="font-bold text-blue-400">IPC {section}</div>
                <div className="text-xs text-slate-400 mt-1 truncate">
                  {IPC_TO_BNS_MAP[section]?.title}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>This mapper contains commonly used sections. For comprehensive legal advice, please consult a legal professional.</p>
          <p className="mt-2">Data updated as per Bharatiya Nyaya Sanhita, 2023</p>
        </div>

      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}