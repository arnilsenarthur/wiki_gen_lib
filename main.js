//Import libs
const showdown = require('showdown');
const showdownHighlight = require("showdown-highlight");
const cheerio = require('cheerio')
const fs = require('fs');
const { argv } = require('process');

//Create conversor
const converter = new showdown.Converter({
    emoji: true,
    extensions: [showdownHighlight],
    tasklists: true,
    tables: true,
    strikethrough: true,
    ghMentions: true
});

function createPage(page, template, nav, home, header, footer, returnlink, versions, version, lang, labels, languages, language_index) {
    //External Variables
    let title = page.title;
    let subtitle = page.subtitle;

    let last_change = {
        author: page.last_modified[0],
        date: page.last_modified[1]
    };

    let creation = {
        author: page.created[0],
        date: page.created[1]
    };

    let tags =
        /*[{
               text: "main tag",
               color: "blue"
           }, {
               text: "2 tag",
               color: "red"
           }]*/
        page.tags;

    /*
    let path = [{
        text: 'code-braces',
        disabled: true,
        normal: false,
        href: 'breadcrumbs_dashboard',
    }];
    */

    let path = [{
        text: version,
        disabled: true,
        normal: true,
        href: '',
    }];

    let sp = page.path_simple.split("/");
    for (let i = 0; i < sp.length; i++)
        path.push({
            text: sp[i],
            disabled: true,
            normal: true,
            href: ''
        });

    let versionlabel = page.version;

    /////////////////////////////
    let mds = fs.readFileSync("content/" + lang + "/" + page.source, { encoding: 'utf8', flag: 'r' });
    let content = converter.makeHtml(mds);
    let source = JSON.stringify(compressString(mds));
    const $ = cheerio.load(content);

    //Sections info
    let sections = [];

    //Format

    //H1 & H2
    $("h1,h2").each(function(i, elm) {
        sections.push({ text: $(elm).text(), level: $(elm).prop("tagName") == "H1" ? 0 : 1, color: $(elm).prop("tagName") == "H1" ? "black" : "gray", target: $(elm).attr("id") });
    });

    //Code      
    {
        $("code").css("background-color", "transparent");
        $("code").parent().addClass("hljs");
        $("code").parent().addClass("hljspre");
        $("code").addClass("hljscontent");

        //Get language for a code
        $("code").each(function(i, x) {
            let ss = $(x).attr("class").split(/\s+/);
            let language = "";
            for (let i in ss) {
                let s = ss[i];

                if (s.startsWith("language-")) {
                    language = s.substring(9);
                }
            }
        });
    }

    //Blockcode -> Messages
    $("blockquote").each(function(i, elm) {
        let content = $(elm).text().trim();
        let parent = $(elm).parent();

        let type = "info";
        if (content.match(new RegExp("^{.*}.*"))) {
            type = content.substr(1).split("}")[0];
            content = content.substr(content.indexOf("}") + 1);
        }
        let ctt = '<v-alert dense type="' + type + '" text>' + content.replace("\n", "<br>") + '</v-alert>';
        $(elm).replaceWith(ctt);
    });

    //Lists
    $("li").each(function(i, elm) {
        let content = $(elm).html();

        let onclick = "";

        if ($(this).find("a").length > 0) {
            onclick = 'window.location.href = \'' + $(this).find("a").attr("href") + "\'";
            $(elm).replaceWith('<div class="list_item linkholder" onclick="' + onclick + '"><b>' + content + "</b></div");
        } else
            $(elm).addClass("list_item");


        if ($(this).find("input").length > 0) {
            $(this).find("input").replaceWith("<v-checkbox " + ($(this).find("input").prop("checked") ? "input-value=\"true\"" : "") + " value disabled style=\"transform: translate(0px,-4px); float: left;height: 20px;margin-top: 0px; margin-bottom: 0px\"></v-checkbox>");
            $(this).replaceWith("<div class=\"list_item tasks\" style=\"height:30px\">" + $(this).html() + "<br></div>");
        }
    });

    //Table
    $("table").each(function(i, elm) {
        let content = $(elm).html();
        $(elm).replaceWith("<v-simple-table><template v-slot:default>" + content + "</template></v-simple-table>")
    });

    //Check if is the lastest version
    let comp_version = parseFloat(version);
    let max = 0;
    let max_st = "";

    for (let i = 0; i < versions.length; i++) {
        let f = parseFloat(versions[i].title);
        if (f > max) {
            max = f;
            max_st = versions[i].title;
        }
    }


    let warnings = max > comp_version ? '<v-alert dense type="error" text>' + labels.outdated.replace("%%", version).replace("%%", max_st) + '</v-alert>' : '';

    if (!fs.existsSync("output/" + lang))
        fs.mkdirSync("output/" + lang);

    fs.writeFileSync("output/" + lang + "/" + page.path.replace("/", "_") + ".html",
        template.replace("$$content$$", warnings += $("body").html())
        .replace("$$sections$$", JSON.stringify(sections))
        .replace("$$source$$", source)
        .replace("$$title$$", title)
        .replace("$$navtitle$$", "v" + version + " - " + title)
        .replace("$$subtitle$$", subtitle)
        .replace("$$last_change$$", JSON.stringify(last_change))
        .replace("$$creation$$", JSON.stringify(creation))
        .replace("$$tags$$", JSON.stringify(tags))
        .replace("$$versionlabel$$", versionlabel)
        .replace("$$navigation$$", JSON.stringify(nav))
        .replace("$$path$$", JSON.stringify(path))
        .replace("$$home$$", home.replace("/", "_"))
        .replace("$$header$$", header)
        .replace("$$footer$$", footer)
        .replace("$$return$$", returnlink)
        .replace("$$version$$", version)
        .replace("$$versions$$", JSON.stringify(versions))

        .replace("$$lang_change$$", labels.version_change)
        .replace("$$lang_sections$$", labels.sections)
        .replace("$$lang_tags$$", labels.tags)
        .replace("$$lang_created$$", labels.last_edited)
        .replace("$$lang_edited$$", labels.created_by)
        .replace("$$lang_footer$$", labels.footer)
        .replace("$$languages$$", JSON.stringify(languages))
        .replace("$$currentlanguage$$", language_index)
        .replace("$$curlang$$", lang)
        .replace("$$languagetitle$$", labels.language_title)
        .replace("$$languagetext$$", labels.language_text)
        .replace("$$languageclose$$", labels.language_close)

    );
}

//Used to compress source code
function compressString(c) {
    var x = 'charCodeAt',
        b, e = {},
        f = c.split(""),
        d = [],
        a = f[0],
        g = 256;
    for (b = 1; b < f.length; b++) c = f[b], null != e[a + c] ? a += c : (d.push(1 < a.length ? e[a] : a[x](0)), e[a + c] = g, g++, a = c);
    d.push(1 < a.length ? e[a] : a[x](0));
    for (b = 0; b < d.length; b++) d[b] = String.fromCharCode(d[b]);
    return d.join("")
}

//Load internal settings, variables, etc...
function loadInternalData() {
    try {
        let content = fs.readFileSync("internal/internal.json", { encoding: 'utf8', flag: 'r' });

        return JSON.parse(content);
    } catch (e) {

    }

    let internal = {
        current_user: "Admin"
    };

    //Save default internal
    saveInternal(internal);
    return internal;
}

function saveInternal(internal) {
    fs.writeFileSync("internal/internal.json", JSON.stringify(internal));
}

/**
  ____    _             _     _               _      ____    ___      ____                
 / ___|  | |_    __ _  | |_  (_)   ___       / \    |  _ \  |_ _|    / ___|   ___   _ __  
 \___ \  | __|  / _` | | __| | |  / __|     / _ \   | |_) |  | |    | |  _   / _ \ | '_ \ 
  ___) | | |_  | (_| | | |_  | | | (__     / ___ \  |  __/   | |    | |_| | |  __/ | | | |
 |____/   \__|  \__,_|  \__| |_|  \___|   /_/   \_\ |_|     |___|    \____|  \___| |_| |_|
                                                                                          
 */

var internal = loadInternalData();

console.log("\n---------------------------------------");
if (process.argv.length < 3) {
    console.log("Static Api Pages Generator v1.0");
    console.log("Current user: " + internal.current_user);
} else {
    if (process.argv[2] == "user") {
        if (process.argv.length > 3) {
            internal.current_user = process.argv[3].split("-").join(" ");
            saveInternal(internal);
            console.log("User changed to: " + internal.current_user);
        } else
            console.log("Use: user <username-name-name>");
    } else if (process.argv[2] == "export") {
        console.log("Stating exportation process..");
        console.log("");

        //Preparing
        {
            var deleteFolderRecursive = function(path) {
                if (fs.existsSync(path)) {
                    fs.readdirSync(path).forEach(function(file, index) {
                        var curPath = path + "/" + file;
                        if (fs.lstatSync(curPath).isDirectory()) { // recurse
                            deleteFolderRecursive(curPath);
                        } else { // delete file
                            fs.unlinkSync(curPath);
                        }
                    });
                    fs.rmdirSync(path);
                }
            };

            //1 - Delete old files
            console.log("Deleting old files...");
            let n = 0;
            fs.readdirSync("output").forEach(file => {
                if (file != "code_styles" && file != "css" && file != "js" && file != "media") {
                    if (!fs.lstatSync("output/" + file).isDirectory())
                        fs.unlinkSync("output/" + file);
                    else
                        deleteFolderRecursive("output/" + file);
                    n++;
                }
            });
            console.log("Deleted " + n + " old files!");
        }

        let langs = JSON.parse(fs.readFileSync("languages.json", { encoding: 'utf8', flag: 'r' }));

        //Template
        let template = fs.readFileSync("internal/template.html", { encoding: 'utf8', flag: 'r' });
        let pg_count = 0;

        let langselectors = [];

        for (let langi in Object.keys(langs)) {
            let lang = Object.keys(langs)[langi];
            langselectors.push({ text: langs[lang], href: lang });
        }

        for (let langi in Object.keys(langs)) {
            let lang = Object.keys(langs)[langi];

            let main;

            //Main init
            {
                console.log("Loading lang '" + lang + "'");
                //2 - Parse main.json
                main = JSON.parse(fs.readFileSync("content/" + lang + "/main.json", { encoding: 'utf8', flag: 'r' }));

                console.log("");
            }

            let structure = main.docs;

            let versions = [];
            let pages = [];

            let navs = [];

            for (let v in Object.keys(structure)) {
                console.log("- Version: " + Object.keys(structure)[v])
                main.structure = structure[Object.keys(structure)[v]].structure;
                versions.push({
                    title: Object.keys(structure)[v],
                    home: (Object.keys(structure)[v].replace(".", "_") + "_" + structure[Object.keys(structure)[v]].home).replace("/", "_")
                });


                let nav = [];
                //Create Tree
                {
                    console.log("  - Generating Tree");
                    for (let i in Object.keys(main.structure)) {
                        let k = Object.keys(main.structure)[i];

                        //Header
                        nav.push({
                            text: k,
                            isheader: true
                        });

                        let path = "";
                        let path_simple = "";
                        //Iterate pages
                        for (let j in Object.keys(main.structure[k])) {
                            let l = Object.keys(main.structure[k])[j];

                            if (l == "path") {
                                path = Object.keys(structure)[v].replace(".", "_") + "_" + main.structure[k][l];
                                path_simple = main.structure[k][l];
                            } else {
                                //Page
                                console.log("    - Indexing page '" + k + " > " + l + "'");
                                let pre = main.structure[k][l].path;
                                main.structure[k][l].path = path + "/" + main.structure[k][l].path;
                                main.structure[k][l].path_simple = path_simple + "/" + pre;
                                main.structure[k][l].title = l;
                                main.structure[k][l].home = Object.keys(structure)[v].replace(".", "_") + "_" + structure[Object.keys(structure)[v]].home;
                                main.structure[k][l].version = Object.keys(structure)[v];

                                let tags = [];


                                for (let m = 0; m < main.structure[k][l].tags.length; m++)
                                    tags.push({
                                        text: main.structure[k][l].tags[m],
                                        color: structure[Object.keys(structure)[v]].tags[main.structure[k][l].tags[m]].color
                                    });

                                main.structure[k][l].tags = tags;

                                nav.push({
                                    text: l,
                                    icon: "mdi-" + main.structure[k][l].icon,
                                    isheader: false,
                                    href: main.structure[k][l].path.replace("/", "_")
                                });

                                pages.push(main.structure[k][l]);
                                pg_count++;
                            }
                        }
                    }
                    console.log("");
                }

                navs[Object.keys(structure)[v]] = nav;
            }

            //Generate files for lang
            {
                for (let i = 0; i < pages.length; i++) {
                    createPage(pages[i], template, navs[pages[i].version], pages[i].home, main.header, main.footer, main.return, versions, pages[i].version, lang, main.labels, langselectors, langi);
                }
            }
        }
        console.log(">>> Generated " + pg_count + " pages!");
    } else {
        //Invalid comand and show valid command list    
    }
}
console.log("---------------------------------------\n");


//createPage("main.md", "template.html", "test.html");