Hi! I'm Jake and I'm <span class="what-am-i"></span> living in Brooklyn, NY.
I use code to <a href="https://jakewelch.design" target="_blank">design</a> cool projects and to <a href="https://instagram.com/jake___welch" target="_blank">experiment</a> with new ideas.
In my free time I love to read, write, fall down research rabbit holes, bike around the city, and build archives of whatever I find interesting, usually relating to history, art, the city, people, ephemera, and the internet.
<br><br> 
Feel free to poke around, every box you see has a header with the file name as it's saved on my computer, and  clicking it links to its source code. Inside the boxes you'll find text, images, and gifs, many of which might link to something cool, so click around! While this site works <I>okay</I> on mobile, desktop is highly recommended.
<br><br>
If you're at all
interested in building your own personal site, I've written a <a href="https://tutorials.jakewel.ch/build-a-website.html" target="_blank">beginner-friendly guide</a> on how to do that for free! 
<br><br>
Thanks for visiting!

<style>
.what-am-i {
display: inline-block;
width: 105px;
text-align: center;
}
</style>

<script>
        const words = [
            "a designer",
            "a developer",
            "an artist",
            "a researcher",
            "a listener",
            "a cat owner",
            "a technologist",
            "a ponderer",
            "a daydreamer",
            "a programmer",
	    "a luddite",
	    "a park enjoyer",
	    "a writer",
	    "a reader", 
	    "a web surfer",
	    "a history buff",
	    "an archivist",
	    "a documentarian",
	    "a friend",
        ];
        let index = 0;
        const span = document.querySelector('.what-am-i');
        setInterval(() => {
            span.textContent = words[index];
            index = (index + 1) % words.length;
        }, 500);
    </script>
